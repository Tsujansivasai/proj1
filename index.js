const express = require("express");
const { Sequelize, DataTypes, Op } = require('sequelize'); 
const dotEnv = require("dotenv");
const ejs = require('ejs');
const { sendMail, sendOTPEmail, sendPasswordResetSuccessEmail, sendSignupConfirmationEmail } = require('./mailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path')
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4500;

// JWT Configuration Check
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env file');
    process.exit(1);
}

// --- Sequelize Database Connection ---
const sequelize = new Sequelize(
    process.env.PG_DATABASE,
    process.env.PG_USER,
    process.env.PG_PASSWORD,
    {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT, 
        dialect: 'postgres',
        logging: false 
    }
);

// Import Sequelize User Model
const User = require('./models/User')(sequelize); 

// Authenticate and Sync Database
sequelize.authenticate()
    .then(() => {
        console.log('PostgreSQL Connection has been established successfully.');
        return sequelize.sync({ alter: true }); 
    })
    .then(() => {
        console.log('All models were synchronized successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database or sync models:', err);
        process.exit(1); 
    });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

//middlewares to verify jwt
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("Auth Header:", authHeader);

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        console.log("Received Token:", token);

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                console.error("JWT Verification Error:", err);
                return res.status(403).json({ message: "Invalid token" });
            }
            req.user = user;
            console.log("JWT Payload (req.user):", req.user);
            next();
        });
    } else {
        res.status(401).json({ message: "Authorization token missing or malformed" });
    }
};

// --- Routes ---
app.get('/signup', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

// Register User
app.post('/register', async (req, res) => {
    const { username, email, password, phonenumber } = req.body;
    console.log("Registering user:", { username, email, phonenumber });

    try {
        // Use Sequelize's findOne
        let user = await User.findOne({ where: { email } });
        if (user) {
            console.log("Registration failed: User with this email already exists.");
            return res.status(409).json({ success: false, message: "User with this email already exists." });
        }
        const hashedPassword = await bcrypt.hash(password, 12);

        user = await User.create({
            username,
            email,
            password: hashedPassword,
            phonenumber
        });

        console.log("User registered successfully:", user.email);

        await sendSignupConfirmationEmail(
            email,
            username
        );
        console.log("Welcome email sent to:", email);
        res.status(201).json({ success: true, message: "Registration successful. Please login." });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ success: false, error: 'User with this email already exists.' });
        }
        res.status(500).json({ success: false, error: 'Server error during registration' });
    }
});

// User Login with JWT
app.post('/user-login', async (req, res) => {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log("Login failed: User not found for email:", email);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const checkPassword = await bcrypt.compare(password, user.password);
        if (!checkPassword) {
            console.log("Login failed: Incorrect password for email:", email);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        const token = jwt.sign(
            {
                userId: user.id, 
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log("User logged in successfully:", user.email);
        await sendMail(
            email,
            "Login Successful",
            `You have successfully logged in.`
        );
        console.log("Login success email sent to:", email);

        res.json({
            success: true,
            token,
            user: {
                id: user.id, 
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
});
// Edit Profile
app.put('/user/edit', authenticateJWT, async (req, res) => {
    const { username, password, phonenumber } = req.body;
    const email = req.user.email;

    console.log("--- Profile Edit Attempt ---");
    console.log("User from JWT (req.user.email):", email);
    console.log("Data received in request body (req.body):", { username, password, phonenumber });

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.log("Edit failed: User not found for email:", email);
            return res.status(404).json({ message: "User not found" });
        }

        console.log("User found in DB (before update):", user.username, user.email, user.phonenumber);

        let changesMade = false;

        if (username && username !== user.username) {
            user.username = username;
            changesMade = true;
            console.log("Updating username to:", username);
        }
        if (phonenumber && phonenumber !== user.phonenumber) {
            user.phonenumber = phonenumber;
            changesMade = true;
            console.log("Updating phonenumber to:", phonenumber);
        }
        if (password) {
            if (!await bcrypt.compare(password, user.password)) {
                const hashedPassword = await bcrypt.hash(password, 12);
                user.password = hashedPassword;
                changesMade = true;
                console.log("Updating password.");
            } else {
                console.log("New password is same as old. Not updating.");
            }
        }

        if (changesMade) {
            try {
                const savedUser = await user.save();
                console.log("User profile updated successfully for:", savedUser.email);
                console.log("User data AFTER save (from Sequelize response):", savedUser.username, savedUser.email, savedUser.phonenumber);
                res.json({ message: "Profile updated successfully" });
            } catch (saveError) {
                console.error("Error during user.save():", saveError);
                res.status(500).json({ message: "Failed to save profile changes", error: saveError.message });
            }
        } else {
            console.log("No changes detected for user:", user.email);
            res.json({ message: "No changes to apply" });
        }

    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: "Server error during profile update", error: err.message });
    }
});

// Delete User
app.delete('/user/delete', authenticateJWT, async (req, res) => {
    const userId = req.user.userId; 
    const userEmail = req.user.email; 

    console.log("--- User Deletion Attempt ---");
    console.log("Attempting to delete user with ID:", userId, "and Email:", userEmail);

    try {
        const deletedRowCount = await User.destroy({
            where: { id: userId }
        });

        if (deletedRowCount === 0) {
            console.log("Delete failed: User not found for ID:", userId);
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`User with ID ${userId} deleted successfully.`);

        await sendMail(
            userEmail, 
            "Account Deletion Confirmation",
            `Dear User,\n\nYour account has been successfully deleted from our platform.`
        );
        console.log("Account deletion confirmation email sent to:", userEmail);



        res.json({ message: "User deleted successfully" });

    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: "Server error during user deletion", error: err.message });
    }
});


// Send OTP (POST /auth/forgot-password)
app.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log("Forgot password request for email:", email);

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log("Forgot password: User not found for email:", email);
            return res.status(200).json({ success: true, message: "If an account with that email exists, an OTP has been sent." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        user.isOtpVerified = false; 
        await user.save(); 
        console.log(`OTP generated for ${email}: ${otp}`);

        await sendOTPEmail(user.email, otp, user.username);
        console.log("OTP email sent to:", email);

        res.status(200).json({ success: true, message: "OTP sent to your email." });

    } catch (error) {
        console.error('Error in forgot password (send OTP):', error);
        res.status(500).json({ success: false, error: 'Server error during OTP generation/sending.' });
    }
});

// Verify OTP (POST /auth/verify-otp)
app.post('/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    console.log(`Verifying OTP for email: ${email}, OTP: ${otp}`);

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log("Verify OTP: User not found for email:", email);
            return res.status(400).json({ success: false, message: "Invalid email or OTP." });
        }

        if (user.otp === otp && user.otpExpiry && user.otpExpiry > new Date()) { 
            user.isOtpVerified = true;
           
            await user.save(); 
            console.log(`OTP verified successfully for ${email}.`);
            res.status(200).json({ success: true, message: "OTP verified successfully. You can now reset your password." });
        } else {
            console.log(`OTP verification failed for ${email}: Mismatch or expired.`);
            user.isOtpVerified = false; 
            await user.save();
            res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

    } catch (error) {
        console.error('Error in verify OTP:', error);
        res.status(500).json({ success: false, error: 'Server error during OTP verification.' });
    }
});

//  Reset Password (POST /auth/reset-password)
app.post('/auth/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    console.log(`Reset password request for email: ${email}`);

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log("Reset password: User not found for email:", email);
            return res.status(400).json({ success: false, message: "Invalid request." });
        }

        if (!user.isOtpVerified) {
            console.log(`Reset password failed for ${email}: OTP not verified.`);
            return res.status(403).json({ success: false, message: "OTP not verified. Please verify OTP first." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        user.otp = null; 
        user.otpExpiry = null; 
        user.isOtpVerified = false; 
        await user.save(); 
        console.log(`Password reset successfully for ${email}.`);

        await sendPasswordResetSuccessEmail(user.email, user.username);
        console.log("Password reset success email sent to:", email);

        res.status(200).json({ success: true, message: "Password has been reset successfully." });

    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ success: false, error: 'Server error during password reset.' });
    }
});



// const storage = multer.diskStorage({
//     destination: './upload/images',
//     filename: (req, file, cb) => {
//         return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
//     }
// })

// const upload = multer({
//     storage: storage,
//     limits: {
//         fileSize: 1000000
//     }
// })
// app.use('/profile', express.static('upload/images'));
// app.post("/upload", upload.single('profile'), (req, res) => {

//     res.json({
//         success: 1,
//         profile_url: `http://localhost:4502/profile/${req.file.filename}`
//     })
// })

// function errHandler(err, req, res, next) {
//     if (err instanceof multer.MulterError) {
//         res.json({
//             success: 0,
//             message: err.message
//         })
//     }
// }


app.post('/logout', (req, res) => {

    console.log("Logout initiated (client-side token discard assumed for JWT).");
    res.json({ message: "Logged out successfully (token discarded)." });
});

app.listen(PORT, () => {
    console.log(`Server started and Running @ ${PORT}`);
});
