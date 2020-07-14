import * as fc from "fast-check";

const reverseList = <A>(a: A[]): A[] => a.slice().reverse();

const arbitrary = fc.array(fc.anything())

describe("Property testing!", () => {
  it("Manual arbitrary", () => {
    const arrs = fc.sample(arbitrary)
    const predicate = arr => Array.isArray(arr)
    arrs.forEach(arr => expect(predicate(arr)).toEqual(true))
  })
  it("Reversed list has the same length", () => {
    fc.assert(
      fc.property(arbitrary, as => { 
        expect(as.length).toEqual(reverseList(as).length)
      } ))
  })
  it("Reversing a list twice is the same as the original list", () => {
    fc.assert(
      fc.property(arbitrary, as =>
        expect(as).toEqual(reverseList(reverseList(as)))
      )
    );
  });
});

const userArbitrary = fc.record({
  firstname: fc.string(),
  surname: fc.string(),
  age: fc.integer()
})

interface User {
  firstname: string
  surname: string
  age: number
}

const createUsernameBad = (user: User): string => 
  user.firstname.slice(0,1) 
    + user.surname.slice(0,5) 
    + String(user.age).slice(0,2)

const createUsername = (user: User): string => 
  user.firstname.slice(0,1).padEnd(1,"-") 
    + user.surname.slice(0,5).padEnd(5,"-") 
    + String(user.age).slice(0,2).padStart(2,'0')


describe("More complicated", () => {
  it("Encodes and decodes URI", () => {
     fc.assert(fc.property(userArbitrary, user => {
       const username = createUsername(user)
       return expect(decodeURI(encodeURI(username))).toEqual(username)
     }))
  })
  it.skip("Is always 8 chars long (bad function)", () => {
    fc.assert(fc.property(userArbitrary, user => {
       const username = createUsernameBad(user)
       return expect(username.length).toEqual(8)
     }))
  })

  it("Is always 8 chars long", () => {
    fc.assert(fc.property(userArbitrary, user => {
       const username = createUsername(user)
       return expect(username.length).toEqual(8)
     }))
  })
})
