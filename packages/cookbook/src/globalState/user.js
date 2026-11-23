export const LOGIN = "USER::LOGIN";
export const LOGIN_SUCCESS = "USER::LOGIN_SUCCESS";
export const LOGIN_FAILURE = "USER::LOGIN_FAILURE";
export const GET_CURRENT_USER = "USER::GET_CURRENT_USER";
export const GET_CURRENT_USER_SUCCESS = "USER::GET_CURRENT_USER_SUCCESS";
export const GET_CURRENT_USER_FAILURE = "USER::GET_CURRENT_USER_FAILURE";
export const FETCH_USERS = "USER::FETCH_USERS";
export const FETCH_USERS_SUCCESS = "USER::FETCH_USERS_SUCCESS";
export const FETCH_USERS_FAILURE = "USER::FETCH_USERS_FAILURE";
export const UPDATE = "USER::UPDATE";
export const UPDATE_SUCCESS = "USER::UPDATE_SUCCESS";
export const UPDATE_FAILURE = "USER::UPDATE_FAILURE";
export const UPDATE_PASSWORD = "USER::UPDATE_PASSWORD";
export const UPDATE_PASSWORD_SUCCESS = "USER::UPDATE_PASSWORD_SUCCESS";
export const UPDATE_PASSWORD_FAILURE = "USER::UPDATE_PASSWORD_FAILURE";
export const FAVORITE_UPDATED = "USER::FAVORITE_UPDATED";
export const CREATE = "USER::CREATE";
export const CREATE_SUCCESS = "USER::CREATE_SUCCESS";
export const CREATE_FAILURE = "USER::CREATE_FAILURE";
export const LOGOUT = "USER::LOGOUT";

export const userQuery = `
  idPk
  legalFirstName
  legalMiddleName
  legalLastName
  birthFirstName
  birthMiddleName
  birthLastName
  preferredName
  nickname
  email
  birthday
  avatar
  isAdmin
  gender
  phoneNumber
  lastOnline
`;

const ACTION_HANDLERS = {
  [UPDATE_PASSWORD_FAILURE]: (state, { payload: _payload }) => {
    return {
      ...state,
      activeUser: {
        ...state.activeUser,
      },
    };
  },
  [LOGIN]: (state, { payload: _payload }) => {
    return {
      ...state,
      loggingIn: true,
    };
  },
  [LOGIN_SUCCESS]: (state, { payload: _payload }) => {
    return {
      ...state,
      loggingIn: false,
    };
  },
  [LOGIN_FAILURE]: (state, { payload: _payload }) => {
    return {
      ...state,
      loggingIn: false,
      authenticating: false,
    };
  },
  [GET_CURRENT_USER_SUCCESS]: (state, { payload }) => {
    return {
      ...state,
      activeUser: payload,
    };
  },
  [GET_CURRENT_USER_FAILURE]: (state) => {
    return {
      ...state,
      authenticating: false,
    };
  },
  [FETCH_USERS_SUCCESS]: (state, { payload }) => {
    return {
      ...state,
      authenticating: false,
      users: payload,
    };
  },
  [UPDATE_SUCCESS]: (state, { payload }) => {
    return {
      ...state,
      activeUser: {
        ...state.activeUser,
        ...payload,
      },
    };
  },
  [LOGOUT]: (state) => {
    return {
      ...state,
      activeUser: {
        id: "",
        attributes: [],
        favoriteRecipes: [],
      },
    };
  },
};

const initialState = {
  authenticating: true,
  activeUser: {},
  users: [],
};

export default function userReducer(state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type];

  return handler ? handler(state, action) : state;
}
