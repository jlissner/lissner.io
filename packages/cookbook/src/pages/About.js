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
  link: {
    color: theme.palette.secondary.main,
    cursor: "pointer",
    padding: 0,
    textTransform: "none",
    textDecoration: "none",
    "&:hover": {
      color: theme.palette.secondary.dark,
    },
  },
});

class About extends React.PureComponent {
  render() {
    const { classes } = this.props;

    return (
      <div>
        <Typography variant="h2" paragraph>
          About the Family Cookbook
        </Typography>
        <Typography align="right" variant="h6" paragraph>
          December, 2019
        </Typography>
        <Paper elevation={1} className={classes.paper}>
          <Typography paragraph variant="body1">
            Dear Family,
          </Typography>

          <Typography paragraph variant="body1">
            For the past 5 years or so Ellie and I have been working on a
            website for the family,{" "}
            <a href="https://lissner.io" className={classes.link}>
              lissner.io
            </a>
            . Today, I am happy to announce that the{" "}
            <strong>Family Cookbook</strong> portion of the website has been
            released! Connie released the latest edition of the family cookbook
            21 years ago (find the recipe for Addie's Bourbon Slush to
            celebrate), then 4 years ago Patrick created a digital version of it
            which allowed many my generation to get their own version of it for
            the first time. Since then, everyone's version has different recipes
            with different notes. For people like my mom, the Colorado edition
            has different recipes in it than the Missouri one which is still
            different from the Florida one. Each and every cookbook has notes
            scrawled around and recipes stuffed in them.
          </Typography>

          <Typography paragraph variant="body1">
            It may take some time to get used to the new format, but I hope that
            the search and filters will provide some help. Additionally, there
            are some new fields added to make it easier for our ever-growing
            user base in order to help people with dietary restrictions. I hope
            each and everyone who has recipes that they love will contribute and
            add those recipes!
          </Typography>

          <Typography paragraph variant="body1">
            Just like all Family Cookbooks, this one is not perfect. Every
            recipe had to be manually entered, so if there is a typo or mistake,
            please let me know! The good news is only one person has to identify
            the mistake for ALL users to get the fix :). As each recipe had to
            be entered in a normalized fashion, some of the recipes have been
            purposefully changed, but I tried to keep the verbiage as close to
            the original as possible. Ellie and I had also spotted some errors
            in certain recipes, and I added what I believe to be the correct
            measurements in those places.
          </Typography>

          <Typography paragraph variant="body1">
            While the family website is launching with only a Cookbook, this
            will be a project that continues to grow. There are lots of features
            that I want to create eventually, including but not limited to:
            family archives, Lissner list, picture sharing, document backups,
            family tree, and more!
          </Typography>

          <Typography paragraph variant="body1">
            In order to access the site, you will need to send me an email FROM
            THE EMAIL YOU WANT TO LOG IN WITH. I will then create your account
            and send you your temporary credentials.
          </Typography>

          <Typography paragraph variant="body1">
            -Love, Joe
          </Typography>

          <Typography paragraph variant="body2">
            p.s. If you have features you would like added, feedback, find bugs,
            want to talk about it, or want to help feel free to contact me.
          </Typography>
        </Paper>

        <Typography align="right" variant="h6" paragraph>
          July, 1998
        </Typography>
        <Paper elevation={1} className={classes.paper}>
          <Typography paragraph variant="body1">
            Dear Family Members,
          </Typography>

          <Typography paragraph variant="body1">
            It's been 15 years since we first began collecting our favorite
            recipes and sharing them with each other. It began in the Scott
            family in the summer of '83 when Mary Kay and Bobbi were both
            getting married. (Did we think they needed help with their cooking?)
            Over time it has expanded to include the Lissner families. Because
            so many of us have enjoyed using the cookbook we have continued to
            save our best new recipes and include them every few years.
          </Typography>

          <Typography paragraph variant="body1">
            Our recipe collection outgrew the little notebooks we kept them in,
            so 2 years ago it seemed to me to be a good time to "re-do" the
            whole thing and move to a bigger binder. Also, this would give me a
            chance to clarify some recipes, to attempt to correct the poor
            spelling (thank you Spellchecker!) and terrible typos as they were
            more and more embarrassing me. Finally, the next generation in the
            family have grown up and wanted a copy and there were no more. So,
            the time was right and I had a shiny new computer with which to
            work. Never mind that I was computer illiterate! So I dragged my
            feet and fretted and wondered how I would ever go about it. But
            finally, my new niece, Gina Schurman came along and said she would
            help me get started and show me a few basic tricks. That was the
            trigger I needed and have been having a wonderful experience putting
            this new updated version of our book together.
          </Typography>

          <Typography paragraph variant="body1">
            It won't be as comfortable at first as the old book because, for one
            thing, all the pages will be clean! (I'm including a plastic sheet
            protector, which you can slip over the page you are currently using,
            to KEEP THOSE PAGES CLEAN!) Also, the format is different and
            recipes aren't where they used to be. I have tried to group similar
            subjects together to make it easier to find what you want. There is
            now a Table of Contents, which was badly needed in the old book. Now
            I realize how much more helpful it would have been to create an
            Index. Oh Well! But I do hope it will be fun to use, that you will
            find new favorites and enjoy seeing the old ones again.
          </Typography>

          <Typography paragraph variant="body1">
            Let's keep on collecting really good recipes and sharing them with
            each other. Send them to me, if you wish, and I'll keep a file and
            "update" from time to time.
          </Typography>

          <Typography paragraph variant="body1">
            I hope each of you will enjoy the new book!
          </Typography>

          <Typography paragraph variant="body1">
            -Love, Connie
          </Typography>
        </Paper>

        <Paper elevation={1} className={classes.paper}>
          <Typography variant="h6" paragraph>
            Editor's (Connie's) Notes
          </Typography>

          <Typography paragraph variant="body1" component="div">
            <ul>
              <li>
                Although I have tried to make the recipes pretty clear, always
                read through the whole recipe so there are no surprises.
              </li>
              <li>
                I have not preceded each recipe with the standard "Preheat the
                oven to..." but please remember to have the oven heating while
                you are putting a recipe together.
              </li>
              <li>
                Quotes in a recipe are those of its author unless otherwise
                indicated
              </li>
              <li>
                Crock-pot is the registered name of a slow cooker but I am using
                the word generically.
              </li>
              <li>
                I do realize all those 10 ounce canes of soup are really 10.75,
                but who wants to write all that!
              </li>
              <li>
                Butter and margarine are used interchangeably unless otherwise
                noted.
              </li>
              <li>
                I have tried to mention the size of the can or package or box in
                order to reduce confusion. However, that has not always been
                possible.
              </li>
              <li>
                Remember Folks, this is a family cookbook. This is{" "}
                <strong>NOT</strong> a diet book! There are no statistics for
                calories, fat grams, and cholesterol content. Not exactly a
                nutritionist's dream. It's home cooking, food we love to eat,
                good tastes. So, kick back and enjoy!
              </li>
            </ul>
          </Typography>
        </Paper>
      </div>
    );
  }
}

export default withStyles(styles)(About);
