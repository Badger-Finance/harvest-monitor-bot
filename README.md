## Description

This bot can be used to monitor strategy harvests done using the [KeeperAccessControl](https://etherscan.io/address/0x711A339c002386f9db409cA55b6A35a604aB6cF6) contract by fetching transactions from the Etherscan API.

## Usage

Set-up a cron job and add bot to a discord server.

## Set-up instructions

1. Install dependencies

```
yarn
```

2. Set environment variables or add them to a .env file (see .env.example)

3. (optional) Update local strategy list and metadata

```
yarn fetch
```

5. Run the following as part of a cron job

```
yarn start
```
