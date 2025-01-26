import { z } from 'zod';
import { GroupId } from './groupModels';

type GroupId = z.infer<typeof GroupId>;
