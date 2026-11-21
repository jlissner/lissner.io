# The Lissner Family Website

_last edited 12/29/19_

This repo is currently just a family cookbook with a lot of hardcoded configuration, hosted with AWS.

## Main Tech Stack

### FrontEnd

- react
  - react-redux
  - redux-thunk
  - react-router
  - LOTS of hooks!
- axios
- lodash
- material-ui

### API

- GraphQL w/Postgraphile
  - Hosted in a docker instance using AWS ECS

### DB

- Postgres
  - Row Level Security enabled (RLS)
  - Hosted in AWS RDS

## AWS Resources

- Route53
- S2
- EC2
- ECS
- ECR
- RDS
- deprecated
  - DynamoDB
    - Moved to Postgres due to it's ability to store documents when needed while having the power of a SQL db
  - Lambda
    - Removed all lambdas as all api calls are now through the graphql server
  - API Gateway
    - Was only there to route api calls to lambdas, so when that was removed it went with it
  - Cognito
    - Ended up going with a homebrew solution using Postgres using Postgres' RLS
