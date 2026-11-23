import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Paper, Typography } from "@material-ui/core";

const styles = (theme) => ({
  paper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(4),
    "&:last-child": {
      marginBottom: 0,
    },
  },
});

class About extends React.PureComponent {
  render() {
    const { classes } = this.props;

    return (
      <div>
        <Typography variant="h4" paragraph>
          Articles From the Cookbook
        </Typography>

        <Paper elevation={1} className={classes.paper}>
          <Typography variant="h6" paragraph>
            On the Subject of Gravy
          </Typography>

          <Typography paragraph variant="body1" component="div">
            Some time ago Amy O'Brien commented that her girls have observed
            that some of the recipes assume one is already experienced in the
            kitchen and that it is not always clear what one should be doing or
            how one gets from here to there. And, it is occurred to me that one
            of life's greatest joys has been omitted from this cookbook: GRAVY!
            Perhaps we just take it for granted that everyone knows how to make
            it! Yet no one should go into adulthood without knowing how to make
            gravy. It just wouldn't be right!
          </Typography>

          <Typography paragraph variant="body1" component="div">
            So, I shall attempt to explain the way I make it. I would imagine
            that there are so many ways to make good gravy as there are cooks.
            So, this is just one way, which I learned at my Mother's knee.
          </Typography>

          <Typography paragraph variant="body1" component="div">
            <ul>
              <li>
                Assume you have been roasting some meat or fowl. When it is
                finished baking, remove it from the baking pan. In the bottom of
                the pan will be the meat juices and some grease. You want to
                leave the juices (flavor!) in the pan but remove all but 2-4
                tablespoons of the grease. Starting with a tablespoon or two of
                flour add it to the pan and add a cup or so of water. Whisk or
                stir the mixture until well blended. As it cooks the mixture
                will thicken. Add more water and continue stirring. Bring the
                mixture to a boil and keep stirring. Add more water until you
                have the consistency you wish to have. Add salt to taste.
              </li>
              <li>
                Note: If you have been boiling potatoes save the potato water
                and use it instead of plain water. It will give you better
                flavor and you are not losing the potato vitamins!
              </li>
              <li>
                Note again: Gravy will taste of flour unless it is cooked well
                into the mixture. So be sure to gently boil your gravy for at
                least 2 minutes.
              </li>
            </ul>
          </Typography>
        </Paper>

        <Paper elevation={1} className={classes.paper}>
          <Typography variant="h6" paragraph>
            Just for the Fun of It: Food-Related Idioms
          </Typography>

          <Typography paragraph variant="body1" component="div">
            <ul>
              <li>Soup to Nuts</li>
              <li>Cold Turkey</li>
              <li>Curry Favor</li>
              <li>Sour Grapes</li>
              <li>Worth One's Salt</li>
              <li>Eat Humble Pie</li>
              <li>Pie in the Sky</li>
              <li>Oil and Water don't mix</li>
              <li>Upper Crust</li>
              <li>To Take the Cake</li>
              <li>Crème de la Crème</li>
              <li>Make No Bones About It</li>
              <li>Fine Kettle of Fish</li>
              <li>To Butter Someone Up</li>
              <li>Cry Over Spilt Milk</li>
              <li>The Milk of Human Kindness</li>
              <li>Salad Days</li>
              <li>Salt of the Earth</li>
              <li>Take with a Grain of Salt</li>
              <li>To Pour Oil on Troubled Waters</li>
              <li>Talk Turkey</li>
              <li>In Hot Water</li>
            </ul>
          </Typography>
        </Paper>

        <Paper elevation={1} className={classes.paper}>
          <Typography variant="h6" paragraph>
            Some Proverbs Using Foods
          </Typography>

          <Typography paragraph variant="body1" component="div">
            <ul>
              <li>An apple a day keeps the doctor away.</li>
              <li>You can't squeeze blood from a turnip.</li>
              <li>One man's meat it another man's poison.</li>
              <li>Man does not live by bread alone.</li>
              <li>A watched pot never boils.</li>
              <li>Plenty of fish in the sea.</li>
              <li>Fish or cut bait.</li>
            </ul>
          </Typography>
        </Paper>
      </div>
    );
  }
}

export default withStyles(styles)(About);
