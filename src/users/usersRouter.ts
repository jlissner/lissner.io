import { Router } from 'express';
import { usersClient } from './usersClient';

export const usersRouter = Router();

usersRouter.post('/', async (req, res) => {
  const { user } = req.session;

  if(user?.sub !== 'jlissner@gmail.com') {
    res.status(403).send();

    return;
  };


  const body = req.body;
  const updated = await usersClient.addUser(body.email);

  console.log(updated);

  res.send(updated);
});

usersRouter.put('/:userId');
usersRouter.get('/:userId');
