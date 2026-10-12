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
import rolesRouter from './routers/rolesRouter.js';
import riskCategoriesRouter from './routers/riskCategoriesRouter.js';
import riskRouter from './routers/riskRouter.js';
import programsRouter from './routers/programsRouter.js';
import weatherCategoriesRouter from './routers/weatherCategoriesRouter.js';
import stageStateHistoryRouter from './routers/stageStateHistoryRouter.js';
import projectStagesRouter from './routers/projectStagesRouter.js';

const router = express.Router();

router.use('/signup', signUpRouter);
router.use('/login', loginRouter);
router.use('/forgot-password', forgotPasswordRouter);
router.use('/reset-password', resetUserPasswordRouter);

router.use(authenticateToken());

router.use('/users', authorize([{ role: 'Admin', scopeType: 'global' }]), usersRouter);
router.use('/roles', rolesRouter);

router.use('/programs', programsRouter);
router.use('/risk-categories', riskCategoriesRouter);
router.use('/weather-categories', weatherCategoriesRouter);
router.use('/projects/:projectId/risk', riskRouter);
router.use('/projects/:projectId/stage-state-history', stageStateHistoryRouter);
router.use('/projects/:projectId/stages', projectStagesRouter);

router.use('/logout', logoutRouter);
router.use('/token', refreshTokenRouter);


export default router;
