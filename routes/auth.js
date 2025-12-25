import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { sendOTPEmail } from '../utils/emailService.js';

const router = express.Router();

// Validation middleware
const registerValidation = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('mobile').matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit mobile number'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

/**
 * @route   GET /api/auth/check-limit
 * @desc    Check if 50-user limit has been reached
 * @access  Public
 */
router.get('/check-limit', async (req, res) => {
    try {
        const verifiedCount = await User.countDocuments({ isVerified: true });
        const limitReached = verifiedCount >= parseInt(process.env.MAX_USERS || '50');

        res.json({
            success: true,
            limitReached,
            verifiedCount,
            maxUsers: parseInt(process.env.MAX_USERS || '50')
        });
    } catch (error) {
        console.error('Error checking limit:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while checking limit'
        });
    }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register user and send OTP
 * @access  Public
 */
router.post('/register', registerValidation, async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, mobile, password } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({  $or: [{ email }, { mobile }] });
        if (existingUser) {
    // If verified user already exists
    if (existingUser.isVerified) {
        if (existingUser.email === email) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered and verified'
            });
        }

        if (existingUser.mobile === mobile) {
            return res.status(400).json({
                success: false,
                message: 'This mobile number is already registered and verified'
            });
        }
    }

    // Not verified → resend OTP (only if email matches)
    if (existingUser.email === email) {
        const otp = existingUser.generateOTP();
        await existingUser.save();

        try {
            await sendOTPEmail(email, name, otp);
        } catch (err) {
            console.error('Email sending failed:', err.message);
        }

        return res.json({
            success: true,
            message: 'OTP resent to your email',
            userId: existingUser._id,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    }

    // Mobile exists but email is new
    return res.status(400).json({
        success: false,
        message: 'This mobile number is already registered'
    });
}


        // Create new user
        const user = new User({
            name,
            email,
            mobile,
            password
        });

        // Generate and save OTP
        const otp = user.generateOTP();
        await user.save();

        // Try to send email, but don't fail if it doesn't work
        try {
            await sendOTPEmail(email, name, otp);
            console.log(`OTP sent to ${email}: ${otp}`);
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            console.log(`OTP for ${email}: ${otp} (Email not sent - check console)`);
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful! OTP sent (check console if email fails)',
            userId: user._id,
            // TEMPORARY: Include OTP in response for testing (REMOVE IN PRODUCTION!)
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];

    return res.status(400).json({
        success: false,
        message:
            field === 'email'
                ? 'This email is already registered'
                : 'This mobile number is already registered'
    });
}

        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and complete registration
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // ✅ Step 1: Verify OTP
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // ✅ Step 2: Temporarily verify user
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // ✅ Step 3: Count verified users
    const maxUsers = parseInt(process.env.MAX_USERS || '50');
    const verifiedCount = await User.countDocuments({ isVerified: true });

    // ❌ Step 4: If limit exceeded, DELETE THIS USER (LAST ONE)
    if (verifiedCount > maxUsers) {
      await User.deleteOne({ _id: user._id });

      return res.status(403).json({
        success: false,
        message: 'Sorry you are late. All the free access slots have been filled.',
        limitReached: true
      });
    }

    // ✅ Step 5: Assign registration order (safe)
    user.registrationOrder = verifiedCount;
    await user.save();

    return res.json({
      success: true,
      message: 'You claimed the free access. You can close this window now.',
      registrationOrder: user.registrationOrder
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to user
 * @access  Public
 */
router.post('/resend-otp', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User is already verified'
            });
        }

        // Generate new OTP
        const otp = user.generateOTP();
        await user.save();

        // Try to send email, but don't fail if it doesn't work
        try {
            await sendOTPEmail(user.email, user.name, otp);
            console.log(`OTP resent to ${user.email}: ${otp}`);
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            console.log(`OTP for ${user.email}: ${otp} (Email not sent - check console)`);
        }

        res.json({
            success: true,
            message: 'OTP resent successfully (check console if email fails)',
            // TEMPORARY: Include OTP in response for testing (REMOVE IN PRODUCTION!)
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP'
        });
    }
});

export default router;


