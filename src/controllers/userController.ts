import { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import catchAsync from '../utils/catchAsync';
import CustomError from '../utils/CustomError';

const filterObj = (obj: Record<string, any>, ...allowedFields: string[]) => {
    const newObj: { [x: string]: any } = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

const getMe = (req: Request | any, res: Response, next: NextFunction) => {
    req.params.id = req.user.id;
    next();
};

const updateMe = catchAsync(async (req: Request | any, res, next) => {
    if (req.body.password || req.body.passwordConfirm)
        return next(
            new CustomError(
                'This route is not for password updates. Please use /updateMyPassword.',
                400
            )
        );

    const filteredBody = filterObj(req.body, 'name', 'email');

    const updatedUser = (await User.update(filteredBody, { where: { id: req.user.id } }))[1].pop();

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

const deleteMe = catchAsync(async (req: Request | any, res, next) => {
    await User.destroy({ cascade: true, where: { id: req.user.id } });

    res.status(200).json({
        status: 'success',
        message: 'Document with document id:' + req.params.id + ' Succesfully deleted.'
    });
});

const getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.findAll();

    res.status(200).json({
        status: 'success',
        data: users
    });
});

const getUser = catchAsync(async (req: Request | any, res, next) => {
    res.status(200).json({
        status: 'success',
        data: await User.findByPk(req.user.id)
    });
});

export default { getAllUsers, deleteMe, getMe, updateMe, getUser };
