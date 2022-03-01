import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import catchAsync from '../utils/catchAsync';
import CustomError from '../utils/CustomError';
import { NextFunction, Request, Response } from 'express';

const signToken = (id: string) => {
    console.log(id);
    return jwt.sign(
        {
            id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '7d'
        }
    );
};

const createSendToken = (user: User, statusCode: number, res: Response) => {
    const token = signToken(user.id);
    const expires = new Date(
        Date.now() + Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
    );
    const expiresUTC = expires.toUTCString();
    const cookieOptions = {
        expires,
        httpOnly: true
    };
    /* if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; */

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        expiresUTC
    });
};

const signup = catchAsync(async (req, res, next: NextFunction) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: User.hashPassword(req.body.password),
        role: req.body.role
    });

    createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) return next(new CustomError('Must provide email and password!', 400));
    console.log(email, password);

    const user = await User.findOne({ where: { email } });
    console.log(user.password, user.verifyPassword(user.password, password));
    if (!user || !user.verifyPassword(password, user.password))
        return next(new CustomError('Incorrect email or password', 401));

    createSendToken(user, 200, res);
});

const protect = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
        token = req.headers.authorization.split(' ')[1];
    else if (req.cookies.jwt) token = req.cookies.jwt;
    if (!token)
        return next(new CustomError('You are not logged in! Please log in to get access', 401));
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser)
        return next(
            new CustomError('The user belonging to this token does not longer exist.', 401)
        );
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

const restrictTo = (...roles: string[]) => {
    return (req: Request | any, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return next(new CustomError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

const updatePassword = catchAsync(async (req: Request | any, res: Response, next) => {
    const user = await User.findByPk(req.user.id);
    if (!user.verifyPassword(user.password, req.body.passwordCurrent))
        return next(new CustomError('Your current password is wrong.', 401));
    user.password = req.body.password;

    await user.save();

    createSendToken(user, 200, res);
});

export default { updatePassword, login, signup, restrictTo, protect };
