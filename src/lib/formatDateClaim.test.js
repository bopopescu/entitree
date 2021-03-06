import React from "react";
import formatDateClaim from "./formatDateClaim";

test("JESUS birth date", () => {
  const claim = [
    {
      mainsnak: {
        datavalue: {
          value: {
            calendarmodel: "http://www.wikidata.org/entity/Q1985786",
            precision: 9,
            time: "-0007-00-00T00:00:00Z",
            timezone: 0,
          },
        },
      },
      rank: "normal",
    },
    {
      mainsnak: {
        datavalue: {
          value: {
            calendarmodel: "http://www.wikidata.org/entity/Q1985786",
            precision: 9,
            time: "-0002-00-00T00:00:00Z",
            timezone: 0,
          },
        },
      },
      rank: "normal",
    },
  ];
  const formatted = formatDateClaim(claim);
  expect(formatted).toBe("7 BCE");
});

test("JESUS death date", () => {
  const claim = [
    {
      mainsnak: {
        datavalue: {
          value: {
            calendarmodel: "http://www.wikidata.org/entity/Q1985786",
            precision: 9,
            time: "+0030-00-00T00:00:00Z",
            timezone: 0,
          },
        },
      },
      rank: "normal",
    },
    {
      mainsnak: {
        datavalue: {
          value: {
            calendarmodel: "http://www.wikidata.org/entity/Q1985786",
            precision: 9,
            time: "+0033-00-00T00:00:00Z",
            timezone: 0,
          },
        },
      },
      rank: "normal",
    },
  ];
  const formatted = formatDateClaim(claim);
  expect(formatted).toBe("30");
});

test("NAPOLEON birth date deprecated first", () => {
  const claim = [
    {
      mainsnak: {
        snaktype: "value",
        property: "P569",
        hash: "814b99d578fd438aebbb60cf21c01de74d993566",
        datavalue: {
          value: {
            time: "+1769-01-01T00:00:00Z",
            timezone: 0,
            before: 0,
            after: 0,
            precision: 9,
            calendarmodel: "http://www.wikidata.org/entity/Q1985727",
          },
          type: "time",
        },
        datatype: "time",
      },
      type: "statement",
      id: "Q517$53576E73-CB76-4960-BEC1-1934DB266963",
      rank: "deprecated",
    },
    {
      mainsnak: {
        snaktype: "value",
        property: "P569",
        hash: "cb855fb606e5ac1fc1a7342973f5b73c3dd08919",
        datavalue: {
          value: {
            time: "+1769-08-15T00:00:00Z",
            timezone: 0,
            before: 0,
            after: 0,
            precision: 11,
            calendarmodel: "http://www.wikidata.org/entity/Q1985727",
          },
          type: "time",
        },
        datatype: "time",
      },
      type: "statement",
      rank: "normal",
    },
  ];
  const formatted = formatDateClaim(claim);
  expect(formatted).toBe("15 Aug 1769");
});
