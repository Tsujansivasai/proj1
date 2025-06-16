const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4, 
            primaryKey: true,
            allowNull: false
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true 
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phonenumber: {
            type: DataTypes.STRING, 
            allowNull: false
        },
        otp: {
            type: DataTypes.STRING,
            allowNull: true 
        },
        otpExpiry: {
            type: DataTypes.DATE,
            allowNull: true 
        },
        isOtpVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },      
        
    }, {

    
    tableName:'users',
    timestamps:true
    }
);

    return User;
};
