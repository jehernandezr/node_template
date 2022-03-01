import express from 'express';
import userRouter from './routes/userRouter';
import CustomError from './utils/CustomError';
import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import errorController from './controllers/errorController';

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(xss());
app.use(hpp());

app.use('/api/users', userRouter);

app.get('/', (req, res) => {
    res.send('Buenas este es un server xdggg asdfsd');
});

// RUN
app.all('*', (req, res, next) => {
    next(new CustomError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorController);

export default app;
