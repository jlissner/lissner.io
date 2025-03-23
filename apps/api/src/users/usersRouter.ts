import { Router } from 'express';
import { usersClient } from './usersClient';

export const usersRouter = Router();


usersRouter.get('/', async (_req, res) => {
  const users = await usersClient.getUsers();

  res.send(users);
});

usersRouter.post('/', async (req, res) => {
  const { body, session } = req;

  if(session.user?.sub !== 'jlissner@gmail.com') {
    res.status(403).send();

    return;
  };
  
  const result = await usersClient.addUser(body);

  res.send(result);
});

// usersRouter.get('/:userId');
// usersRouter.put('/:userId');
