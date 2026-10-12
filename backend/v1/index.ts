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
import stageActivitiesRouter from './routers/stageActivitiesRouter.js';
import stageActivityAttachmentsRouter from './routers/stageActivityAttachmentsRouter.js';
import projectsRouter from './routers/projectsRouter.js';
import contractorsRouter from './routers/contractorsRouter.js';
import projectContractorsRouter from './routers/projectContractorsRouter.js';
import customMilestonesRouter from './routers/customMilestonesRouter.js';
import dprRouter from './routers/dprRouter.js';

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
router.use('/contractors', contractorsRouter);
router.use('/projects', projectsRouter);
router.use('/projects/:projectId/contractors', projectContractorsRouter);
router.use('/projects/:projectId/custom-milestones', customMilestonesRouter);
router.use('/projects/:projectId/milestones', customMilestonesRouter);
router.use('/projects/:projectId/risk', riskRouter);
router.use('/projects/:projectId/stage-state-history', stageStateHistoryRouter);
router.use('/projects/:projectId/stages', projectStagesRouter);
router.use('/projects/:projectId/stage-activities', stageActivitiesRouter);
router.use(
  '/projects/:projectId/stage-activities/:activityId/attachments',
  stageActivityAttachmentsRouter,
);
router.use('/projects/:projectId/dpr', dprRouter);
router.use('/projects/:projectId/dprs', dprRouter);

router.use('/logout', logoutRouter);
router.use('/token', refreshTokenRouter);


export default router;
