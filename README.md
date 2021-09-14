## Description

This bot can be used to monitor strategy harvests done using the [KeeperAccessControl](https://etherscan.io/address/0x711A339c002386f9db409cA55b6A35a604aB6cF6) contract by fetching transactions from the Etherscan API.

## Usage

Add the bot to a discord server and run the folowing command:

```
/harvests
```

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

4. Activate discord commands

```
yarn deploy
```

5. Start bot

```
yarn start
```
