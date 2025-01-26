
type RootDb = {
  users: UserModel[];
  media: MediaModel[];
  recipes: RecipeModel[];
  groups: GroupModel[];
};

type UserModel = {
  email: string;
  displayName: string;
  name: string;
  groups: GroupId[];
};

type GroupModel = {
  id: GroupId;
  name: string;
};

type GroupId = string;

type RecipeModel = {
  id: string;
  name: string;
  directions: string;
  categories: RecipeCategory[];
};

enum RecipeCategory {
  Appetizer = 'appetizer',
  Soup = 'soup',
  Salad = 'salad',
  Bread = 'bread',
  LunchBrunch = 'lunchBrunch',
  Vegetable = 'vegetable',
  Poultry = 'poultry',
  MeatFish = 'meatFish',
  Desserts = 'desserts',
  CookiesBars = 'cookiesBars',
  Cakes = 'cakes',
  Pies = 'pies',
  CandiesSweets = 'candiesSweets',
  Other = 'other',
}
