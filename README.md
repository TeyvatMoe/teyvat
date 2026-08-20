# teyvat

### A type-safe TypeScript library for exploring your Genshin Impact account.

### Documentation live at https://lib.teyvat.moe

## Installation

```zsh
% bun i teyvat
```

## Usage

```ts
import { Teyvat } from 'teyvat';

const teyvat = new Teyvat({ cookies })

const accounts = await teyvat.accounts();
const account = teyvat.account(uid)

const characters = await account.characters()

console.log({ characters })
