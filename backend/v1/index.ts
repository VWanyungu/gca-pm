import express from 'express';
import authenticateToken from './middlewares/token.js';
import authorize from './middlewares/authorize.js';
import usersRouter from './routers/usersRouter.js';
import signUpRouter from './routers/signUpRouter.js';
import loginRouter from './routers/loginRouter.js';
import logoutRouter from './routers/logoutRouter.js';
import refreshTokenRouter from './routers/refreshTokenRouter.js';
import forgotPasswordRouter from './routers/forgotPasswordRouter.js';
import resetUserPasswordRouter from './routers/resetUserPasswordRouter.js';

const router = express.Router();

router.use('/signup', signUpRouter);
router.use('/login', loginRouter);
router.use('/forgot-password', forgotPasswordRouter);
router.use('/reset-password', resetUserPasswordRouter);

router.use(authenticateToken());

router.use('/users', authorize([{ role: 'Admin', scopeType: 'global' }]), usersRouter);
router.use('/logout', logoutRouter);
router.use('/token', refreshTokenRouter);


export default router;
