import { z } from 'zod';
import { UserModel } from './userModels';

type UserModel = z.infer<typeof UserModel>;
