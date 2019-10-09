const crypto = require("crypto");

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

const compare = (st1, st2) =>
  st1.replace(/[\n ]+/g, " ").trim() == st2.replace(/[\n ]+/g, " ").trim();
const expectEqualIgnoreSpaces = (st1, st2) => {
  expect(st1.replace(/[\n ]+/g, " ").trim()).toEqual(
    st2.replace(/[\n ]+/g, " ").trim()
  );
};
const randDigit = () => Math.floor(Math.random() * 10);

describe("mapIntersection", () => {
  const mapIntersection = require("./index").mapIntersection;
  test.each([
    [new Map(), new Map(), new Map()],
    [
      new Map([["a", "b"], ["c", "d"]]),
      new Map([["c", "d"], ["e", "f"]]),
      new Map([["c", "d"]])
    ],
    [
      new Map([["a", "b"], ["cee", "dee"]]),
      new Map([["c", "d"], ["e", "f"]]),
      new Map()
    ],
    [
      new Map([["i", "j"], ["a", "b"], ["g", "h"], ["c", "d"], ["me", "them"]]),
      new Map([["c", "d"], ["e", "f"], ["g", "h"], ["i", "j"], ["me", "us"]]),
      new Map([["i", "j"], ["g", "h"], ["c", "d"]])
    ]
  ])("mapIntersection test %#", (m1, m2, expected) => {
    const actual = mapIntersection(m1, m2);
    expect(actual.size).toEqual(expected.size);
    for (const entry of expected) {
      expect(actual.get(entry[0])).toEqual(entry[1]);
    }
  });
});

describe("mapDifference", () => {
  const mapDifference = require("./index").mapDifference;
  test.each([
    [new Map(), new Map(), new Map()],
    [
      new Map([["a", "b"], ["c", "d"]]),
      new Map([["c", "d"], ["e", "f"]]),
      new Map([["a", "b"]])
    ],
    [
      new Map([["a", "b"], ["cee", "dee"]]),
      new Map([["c", "d"], ["e", "f"]]),
      new Map([["a", "b"], ["cee", "dee"]])
    ],
    [
      new Map([["i", "j"], ["a", "b"], ["g", "h"], ["c", "d"], ["me", "them"]]),
      new Map([["c", "d"], ["e", "f"], ["g", "h"], ["i", "j"], ["me", "us"]]),
      new Map([["a", "b"], ["me", "them"]])
    ]
  ])("mapIntersection test %#", (m1, m2, expected) => {
    const actual = mapDifference(m1, m2);
    expect(actual.size).toEqual(expected.size);
    for (const entry of expected) {
      expect(actual.get(entry[0])).toEqual(entry[1]);
    }
  });
});

describe("getRemoteBranchesByPRStatus", () => {
  const getBranches = n => {
    const branches = [];
    for (let i = 0; i < n; i++) {
      let oid;
      try {
        const sha1 = crypto.createHash("sha1");
        sha1.update(`${i}${randDigit()}`);
        oid = sha1.digest("hex");
      } catch (err) {
        oid = `abcdef${i}${randDigit()}${randDigit()}${randDigit()}`;
      }
      branches.push({
        headRefName: `branch-${i}-${randDigit()}`,
        cursor: `cursor${i}`,
        oid
      });
    }
    return branches;
  };
  const getNodes = branches =>
    branches.map(b => {
      return {
        node: {
          headRefName: b
        }
      };
    });
  const getCallsNeeded = (pageSize, branches) => {
    if (!pageSize || !branches) return 0;
    if (branches.length <= pageSize) return 1;
    return Math.ceil(branches.length / pageSize);
  };
  test.each`
    pageSize | branchCount | expected
    ${10}    | ${10}       | ${1}
    ${10}    | ${11}       | ${2}
    ${1}     | ${3}        | ${3}
    ${100}   | ${7499}     | ${75}
    ${8}     | ${40}       | ${5}
    ${9}     | ${8}        | ${1}
    ${0}     | ${4}        | ${0}
    ${4}     | ${0}        | ${1}
  `(
    "Test helper getCallsNeeded: pageSize $pageSize, $branchCount branches",
    ({ pageSize, branchCount, expected }) => {
      const branches = getBranches(branchCount);
      expect(getCallsNeeded(pageSize, branches)).toEqual(expected);
    }
  );
  function* expectedQueries(orgLogin, repoName, pageSize, branches, status) {
    let calls = 0;
    const callsNeeded = getCallsNeeded(pageSize, branches);
    let endCursor = "";
    while (calls < callsNeeded) {
      const afterClause = calls ? `, after: "${endCursor}"` : ``;
      yield `query {
        organization(login: "${orgLogin}") {
          repository(name: "${repoName}") {
            pullRequests(states: ${status}, first: ${pageSize}${afterClause}) {
              totalCount
              pageInfo {
                endCursor
                hasNextPage
              }
              edges {
                node {
                  headRefName
                  commits(last: 1) {
                    edges {
                      node {
                        commit {
                          oid
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`;
      calls++;
      endCursor =
        branches[calls * pageSize - 1] && branches[calls * pageSize - 1].cursor;
    }
  }
  test("Test helper expectedQueries: pageSize 3, 5 branches, OPEN status", () => {
    const exq = expectedQueries(
      "abc-co",
      "xyz-repo",
      3,
      getBranches(5),
      "OPEN"
    );
    expect(
      exq
        .next()
        .value.replace(/[\n ]+/g, " ")
        .trim()
    ).toEqual(
      `query {
        organization(login: "abc-co") {
          repository(name: "xyz-repo") {
            pullRequests(states: OPEN, first: 3) {
              totalCount
              pageInfo {
                endCursor
                hasNextPage
              }
              edges {
                node {
                  headRefName
                  commits(last: 1) {
                    edges {
                      node {
                        commit {
                          oid
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`
        .replace(/[\n ]+/g, " ")
        .trim()
    );
    const expected2 = `query {
      organization(login: "abc-co") {
        repository(name: "xyz-repo") {
          pullRequests(states: OPEN, first: 3, after: "cursor2") {
            totalCount
            pageInfo {
              endCursor
              hasNextPage
            }
            edges {
              node {
                headRefName
                commits(last: 1) {
                  edges {
                    node {
                      commit {
                        oid
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;
    expectEqualIgnoreSpaces(exq.next().value, expected2);
    const shouldBeDone = exq.next();
    expect(shouldBeDone.value).toBe(undefined);
    expect(shouldBeDone.done).toBe(true);
  });
  test("Test helper expectedQueries: pageSize 2, 6 branches, MERGED status", () => {
    const exq = expectedQueries(
      "abc-co-merged",
      "xyz-repo-merged",
      2,
      getBranches(6),
      "MERGED"
    );
    expect(
      exq
        .next()
        .value.replace(/[\n ]+/g, " ")
        .trim()
    ).toEqual(
      `query {
        organization(login: "abc-co-merged") {
          repository(name: "xyz-repo-merged") {
            pullRequests(states: MERGED, first: 2) {
              totalCount
              pageInfo {
                endCursor
                hasNextPage
              }
              edges {
                node {
                  headRefName
                  commits(last: 1) {
                    edges {
                      node {
                        commit {
                          oid
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`
        .replace(/[\n ]+/g, " ")
        .trim()
    );
    const expected2 = `query {
      organization(login: "abc-co-merged") {
        repository(name: "xyz-repo-merged") {
          pullRequests(states: MERGED, first: 2, after: "cursor1") {
            totalCount
            pageInfo {
              endCursor
              hasNextPage
            }
            edges {
              node {
                headRefName
                commits(last: 1) {
                  edges {
                    node {
                      commit {
                        oid
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;
    expectEqualIgnoreSpaces(exq.next().value, expected2);
    const expected3 = `query {
      organization(login: "abc-co-merged") {
        repository(name: "xyz-repo-merged") {
          pullRequests(states: MERGED, first: 2, after: "cursor3") {
            totalCount
            pageInfo {
              endCursor
              hasNextPage
            }
            edges {
              node {
                headRefName
                commits(last: 1) {
                  edges {
                    node {
                      commit {
                        oid
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;
    expectEqualIgnoreSpaces(exq.next().value, expected3);
    const shouldBeDone = exq.next();
    expect(shouldBeDone.value).toBe(undefined);
    expect(shouldBeDone.done).toBe(true);
  });
  function* expectedResponses(pageSize, branches) {
    let calls = 0;
    const callsNeeded = getCallsNeeded(pageSize, branches);
    let endCursor = "";
    while (calls < callsNeeded) {
      yield {
        data: {
          data: {
            organization: {
              repository: {
                pullRequests: {
                  totalCount: branches.length,
                  pageInfo: {
                    endCursor:
                      branches[
                        Math.min(
                          (calls + 1) * pageSize - 1,
                          branches.length - 1
                        )
                      ].cursor,
                    hasNextPage: calls < callsNeeded - 1
                  },
                  edges: branches
                    .slice(calls * pageSize, (calls + 1) * pageSize)
                    .map(b => ({
                      node: {
                        headRefName: b.headRefName,
                        commits: {
                          edges: [
                            {
                              node: {
                                commit: {
                                  oid: b.oid
                                }
                              }
                            }
                          ]
                        }
                      }
                    }))
                }
              }
            }
          }
        }
      };
      calls++;
      endCursor =
        branches[calls * pageSize - 1] && branches[calls * pageSize - 1].cursor;
    }
  }
  test("Test helper expectedResponses: pageSize 3, 5 branches", () => {
    const branches = [
      {
        headRefName: "hrn1",
        cursor: "c1",
        oid: "abc3"
      },
      {
        headRefName: "hrn2",
        cursor: "c2",
        oid: "fe3"
      },
      {
        headRefName: "hrn3",
        cursor: "c3",
        oid: "8ba"
      },
      {
        headRefName: "hrn4",
        cursor: "c4",
        oid: "91ff"
      },
      {
        headRefName: "hrn5",
        cursor: "c5",
        oid: "23b"
      }
    ];
    const exr = expectedResponses(3, branches);
    const expected1 = {
      data: {
        data: {
          organization: {
            repository: {
              pullRequests: {
                totalCount: 5,
                pageInfo: {
                  endCursor: "c3",
                  hasNextPage: true
                },
                edges: [
                  {
                    node: {
                      headRefName: "hrn1",
                      commits: {
                        edges: [{ node: { commit: { oid: "abc3" } } }]
                      }
                    }
                  },
                  {
                    node: {
                      headRefName: "hrn2",
                      commits: { edges: [{ node: { commit: { oid: "fe3" } } }] }
                    }
                  },
                  {
                    node: {
                      headRefName: "hrn3",
                      commits: { edges: [{ node: { commit: { oid: "8ba" } } }] }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    };
    expect(exr.next().value).toEqual(expected1);
    const expected2 = {
      data: {
        data: {
          organization: {
            repository: {
              pullRequests: {
                totalCount: 5,
                pageInfo: {
                  endCursor: "c5",
                  hasNextPage: false
                },
                edges: [
                  {
                    node: {
                      headRefName: "hrn4",
                      commits: {
                        edges: [{ node: { commit: { oid: "91ff" } } }]
                      }
                    }
                  },
                  {
                    node: {
                      headRefName: "hrn5",
                      commits: { edges: [{ node: { commit: { oid: "23b" } } }] }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    };
    expect(exr.next().value).toEqual(expected2);
  });
  test("Test helper expectedResponses: pageSize 2, 6 branches", () => {
    const branches = [
      {
        headRefName: "myref1",
        cursor: "c1x",
        oid: "xabc3"
      },
      {
        headRefName: "myref2",
        cursor: "c2x",
        oid: "xfe3"
      },
      {
        headRefName: "myref3",
        cursor: "c3x",
        oid: "x8ba"
      },
      {
        headRefName: "myref4",
        cursor: "c4x",
        oid: "x91ff"
      },
      {
        headRefName: "myref5",
        cursor: "c5x",
        oid: "x23b"
      },
      {
        headRefName: "myref6",
        cursor: "c6x",
        oid: "xy23b"
      }
    ];
    const exr = expectedResponses(2, branches);
    const expected1 = {
      data: {
        data: {
          organization: {
            repository: {
              pullRequests: {
                totalCount: 6,
                pageInfo: {
                  endCursor: "c2x",
                  hasNextPage: true
                },
                edges: [
                  {
                    node: {
                      headRefName: "myref1",
                      commits: {
                        edges: [{ node: { commit: { oid: "xabc3" } } }]
                      }
                    }
                  },
                  {
                    node: {
                      headRefName: "myref2",
                      commits: {
                        edges: [{ node: { commit: { oid: "xfe3" } } }]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    };
    expect(exr.next().value).toEqual(expected1);
    const expected2 = {
      data: {
        data: {
          organization: {
            repository: {
              pullRequests: {
                totalCount: 6,
                pageInfo: {
                  endCursor: "c4x",
                  hasNextPage: true
                },
                edges: [
                  {
                    node: {
                      headRefName: "myref3",
                      commits: {
                        edges: [{ node: { commit: { oid: "x8ba" } } }]
                      }
                    }
                  },
                  {
                    node: {
                      headRefName: "myref4",
                      commits: {
                        edges: [{ node: { commit: { oid: "x91ff" } } }]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    };
    expect(exr.next().value).toEqual(expected2);
    const expected3 = {
      data: {
        data: {
          organization: {
            repository: {
              pullRequests: {
                totalCount: 6,
                pageInfo: {
                  endCursor: "c6x",
                  hasNextPage: false
                },
                edges: [
                  {
                    node: {
                      headRefName: "myref5",
                      commits: {
                        edges: [{ node: { commit: { oid: "x23b" } } }]
                      }
                    }
                  },
                  {
                    node: {
                      headRefName: "myref6",
                      commits: {
                        edges: [{ node: { commit: { oid: "xy23b" } } }]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    };
    expect(exr.next().value).toEqual(expected3);
  });
  test("One branch with an OPEN PR", async () => {
    const orgLogin = "abc-co1";
    const repoName = "xyz-repo1";
    const pageSize = 100;
    const branches = getBranches(1);
    const exq = expectedQueries(orgLogin, repoName, pageSize, branches, "OPEN");
    const exr = expectedResponses(pageSize, branches);
    const mockPost = jest.fn(() => {
      return new Promise((resolve, reject) => {
        resolve(exr.next().value);
      });
    });
    jest.doMock("axios", () => {
      return {
        post: mockPost
      };
    });
    const openPRRefNames = require("./index").openPRRefNames;
    const token = "myToken";
    const url = `git@github.com:${orgLogin}/${repoName}.git`;
    const result = await openPRRefNames(token, url, pageSize);
    expect(result.size).toEqual(1);
    expect(result.has(branches[0].headRefName)).toBe(true);
    expect(mockPost).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledTimes(1);
    const args = mockPost.mock.calls[0];
    expect(args.length).toEqual(3);
    const GITHUB_URL = require("./index").GITHUB_URL;
    expect(args[0]).toEqual(GITHUB_URL);
    expectEqualIgnoreSpaces(args[1].query, exq.next().value);
    expect(args[2].headers.Authorization).toEqual(`bearer ${token}`);
  });
  test.each([
    [1, 3, "myLogin", "myRepoName", "OPEN"],
    [5, 10, "abc", "zys", "OPEN"],
    [10, 5, "two", "pages", "OPEN"],
    [80, 20, "eighty", "twenty", "OPEN"],
    [1, 3, "myLogin", "myRepoName", "MERGED"],
    [5, 10, "abc", "zys", "MERGED"],
    [10, 5, "two", "pages", "MERGED"],
    [80, 20, "eighty", "twenty", "MERGED"],
    [1, 3, "myLogin", "myRepoName", "CLOSED"],
    [5, 10, "abc", "zys", "CLOSED"],
    [10, 5, "two", "pages", "CLOSED"],
    [80, 20, "eighty", "twenty", "CLOSED"]
  ])(
    "%d branches, pageSize %d, orgLogin %s, repoName %s, %s PRs",
    async (n, pageSize, orgLogin, repoName, status) => {
      const branches = getBranches(n);
      const exq = expectedQueries(
        orgLogin,
        repoName,
        pageSize,
        branches,
        status
      );
      const exr = expectedResponses(pageSize, branches);
      const mockPost = jest.fn(() => {
        return new Promise(resolve => {
          resolve(exr.next().value);
        });
      });
      jest.doMock("axios", () => {
        return {
          post: mockPost
        };
      });
      let func;
      if (status === "OPEN") {
        func = require("./index").openPRRefNames;
      }
      if (status === "MERGED") {
        func = require("./index").mergedPRRefNames;
      }
      if (status === "CLOSED") {
        func = require("./index").closedPRRefNames;
      }
      const token = "myToken";
      const url = `git@github.com:${orgLogin}/${repoName}.git`;
      const result = await func(token, url, pageSize);
      expect(result.size).toEqual(n);
      branches.forEach(b => {
        expect(result.has(b.headRefName)).toBe(true);
        expect(result.get(b.headRefName)).toEqual(b.oid);
      });
      const expectedCalls = pageSize && Math.ceil(n / pageSize);
      expect(mockPost).toHaveBeenCalledTimes(expectedCalls);
      const GITHUB_URL = require("./index").GITHUB_URL;
      let args;
      for (let i = 0; i < expectedCalls; i++) {
        args = mockPost.mock.calls[i];
        expect(args[0]).toEqual(GITHUB_URL);
        expectEqualIgnoreSpaces(args[1].query, exq.next().value);
      }
      for (let q of exq) {
      }
    }
  );
});
