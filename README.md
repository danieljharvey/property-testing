# Property testing with fast-check

## Installing and running the examples

```bash
git clone https://github.com/danieljharvey/property-testing

yarn install

yarn jest --watchAll
```

## The title of this talk is

- "property testing"

- or

- "better testing through nonsense"

- or

- "how I learned to stop worrying and trust math.random"

## What we are going to talk about today

- What kind of testing are we doing now?

- How is property testing different?

- What cool things can I do with property testing?

## What are we doing now?

Generally, when we do testing, we do some variation of the following:

- Do some setup

- Run some of our `very good code`

- Compare the output of running said code against `some expected value`

- ...profit?

## Unit tests

- Do some setup

```typescript
import { myTestFunction } from "./very-good-code";
```

- Run some of our very good code

```typescript
const actual = myTestFunction("horses");
```

- Compare the output of running said code against some expected value

```typescript
it("does the thing I wanted", () => {
  const expected = "the answer I expect";
  expect(actual).toEqual(expected);
});
```

## DOM testing

- Do some (much more laborious) setup

```typescript
import React from "react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Fetch from "../fetch";

const server = setupServer(
  rest.get("/greeting", (req, res, ctx) => {
    return res(ctx.json({ greeting: "hello there" }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- Run some of our very good code

```typescript
test('loads and displays greeting', async () => {
  render(<Fetch url="/greeting" />)

  fireEvent.click(screen.getByText('Load Greeting'))

  await waitFor(() => screen.getByRole('heading'))
```

- Compare the output of running said code against some expected value

```typescript
 expect(screen.getByRole('heading')).toHaveTextContent('hello there')
  expect(screen.getByRole('button')).toHaveAttribute('disabled')
})
```

## e2e testing

- Do some (simpler) setup

```typescript
describe('My First Test', () => {
  it('clicking "type" shows the right headings', () => {
    cy.visit('https://example.cypress.io')
```

- Run some of our very good code

```typescript
cy.pause();

cy.contains("type").click();
```

- Compare the output of running said code against some expected value

```typescript
    // Should be on a new URL which includes '/commands/actions'
    cy.url().should('include', '/commands/actions')

    // Get an input, type into it and verify that the value has been updated
    cy.get('.action-email')
      .type('fake@email.com')
      .should('have.value', 'fake@email.com')
  })
})
```

## I see you're making a point about these things being the same and I think I get it now.

- The thing in common here is an `oracle`.

- It is a piece of information about the thing we are testing that we must
  manually work out

- Every time we want a new test, we work out another fact about the system

- And then we encode that fact as a test

- Each time the test breaks, we have to manually recalculate the `oracle` to
  ensure it makes sense

## Property testing works differently

- Generate 100s (or 1000000s) of pieces of example data

- Use that data to run our code

- Check that each time we ran the code, some rules were observed

## An example

- Let's say we have a function that reverses arrays

```typescript
const reverseArray = <A>(a: A[]): A[] => a.slice().reverse();
```

- We can generate 1000s of example arrays using `fast-check`.

```typescript
import * as fc from 'fast-check'

const arbitrary = fc.array(fc.anything())

const manyArrays = fc.sample(arbitrary) // 100 random arrays of stuff
```

- Then we can check things out about them.

- For instance "is this really an `Array`?"

```typescript
it("Manual test", () => {
  const arrs = fc.sample(arbitrary)
  const predicate = arr => Array.isArray(arr)
  arrs.forEach(arr => expect(predicate(arr)).toEqual(true))
})
```

- Yes. 

## Arbitraries

An `arbitrary` is a generator of arbitrary values.

- `fc.string()` is a generator of strings

- `fc.array(fc.string())` is a generator of arrays of strings

- `fc.array(fc.anything())` is a generator of arrays that could have absolutely
anything inside

- `fc.record({ name: fc.string{}, age: fc.number()})` is an generator of
  objects with a `name` which is a `string`, and an `age` which is a `number`.

## Back to our lists of anything

- What other properties would be good?

- How about ensuring that the reversed list has the same length?

```typescript
it("Reversed list has the same length", () => {
  fc.assert(
    fc.property(arbitrary, as => 
      expect(as.length).toEqual(reverseList(as).length)
    ))
})
```

- Or that reversing it twice gives us back the same list?

```typescript
it("Reversing a list twice is the same as the original list", () => {
  fc.assert(
    fc.property(arbitrary, as =>
      expect(as).toEqual(reverseList(reverseList(as)))
    )
  );
});
```

- What is nice is that we've just written 300 tests.

## How about something a bit more "business-value-y"?

- We can combine `fast-check`'s functions to create much more useful randomised
  data:

```typescript
// the type
interface User {
  firstname: string
  surname: string
  age: number
}

// the generator for the type
const userArbitrary = fc.record({
  firstname: fc.string(),
  surname: fc.string(),
  age: fc.integer()  // look, we can even have more useful number types
})
```

- Let's test our function for creating a username

```typescript
const createUsernameBad = (user: User): string => 
  user.firstname.slice(0,1) // first char
    + user.surname.slice(0,5)  // first 5 chars
    + String(user.age).slice(0,2) // age as string
```

- Traditionally we'd probably write a test like this:

```typescript
it("Makes the PR reviewer happy", () => {
  const user = {
    firstname: "Kirk",
    surname: "Jambo",
    age: 27
  }
  const expected = "KJambo27"
  expect(createUsernameBad(user)).toEqual(expected)
})
```

- And that'd be just fine.

## Easy now, 10x-er 

- But lets think about some properties

- Let's check that 8 char length. Is it REALLY always right?

```typescript 
it("Is always 8 chars long", () => {
  fc.assert(fc.property(userArbitrary, user => {
     const username = createUsername(user)
     return expect(username.length).toEqual(10)
   })
})
```

- Uh oh

```bash
 Property failed after 1 tests
  { seed: -2096625633, path: "0:0:0:0", endOnFailure: true }
  Counterexample: [{"firstname":"","surname":"","age":0}]
  Shrunk 3 time(s)
  Got error: Error: expect(received).toEqual(expected) // deep equality

  Expected: 8
  Received: 1
```

- We assumed people's names wouldn't in fact be empty strings

- Time to fix our code!

- (Albeit, shoddily)

- Hooray!

```typescript
const createUsername = (user): string => 
  user.firstname.slice(0,1).padEnd(1,"-") 
    + user.surname.slice(0,5).padEnd(5,"-") 
    + String(user.age).slice(0,2).padStart(2,'0')
```

- Now it's totally fine!

## OK.

So you see what we've done here?

We've replaced `oracles` that we must manually calculate with `properties`
about our code.

- Less likely to change over time

- More likely to uncover edge cases

- Generally feel like more of a clever show off

## Other neat properties we can test

- Does our Redux store still make sense after I fire 1,000 arbitrary actions at
  it?

- If I encode our data in `X` format and decode it again, do I get the same thing?

- `X` could be `JSON` or `XML` or some sort of messaging format etc...

- How does our UI component look when I fire nonsense `props` into it? (warning: this is
  often a quick route to feeling very sad and hating CSS)

- How does our API respond to every possible response a third party could send
  us?

## Other neat stuff

- We don't even need to write these `arbitrary` values ourselves most of the
  time:

```typescript
import * as t from `io-ts`
import { getArbitrary } from 'fast-check-io-ts'

// an io-ts validator - think Joi but with nicer TS support
const user = t.type({
  firstname: t.string,
  surname: t.string,
  age: t.number
})

// Typescript type for free!
type User = t.TypeOf<typeof user>

// fast-check arbitrary for free!
const userArbitrary = getArbitrary(user)
```

- We can use these to create sample API endpoints to develop against

```typescript
const endpointIHaventMadeYet = (ctx: Context) => {
  const data = fc.sample(user)[0]
  
  ctx.status = 200
  ctx.data = data
}
```

- Automatic creation of sample data for `contract testing`.

## What did we learn?

- Property testing is good

- That is all.

## Other materials

- https://github.com/dubzzz/fast-check

- https://github.com/gcanti/io-ts
