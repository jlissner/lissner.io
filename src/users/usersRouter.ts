import { Router } from 'express';
import { usersClient } from './usersClient';

export const usersRouter = Router();

usersRouter.post('/', async (req, res) => {
  const { body, session } = req;

  if(session.user?.sub !== 'jlissner@gmail.com') {
    res.status(403).send();

    return;
  };
  
  const result = await usersClient.addUser(body);

  res.send(result);
});

// usersRouter.put('/:userId');
// usersRouter.get('/:userId');
