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

describe("openPRRefNames", () => {
  const getBranches = n => {
    const branches = [];
    for (let i = 0; i < n; i++) {
      let oid;
      try {
        const sha1 = crypto.getHash("sha1");
        sha1.update(`${i}${randDigit()}`);
        oid = sha1.digest("hex");
        console.log(oid);
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
  function* expectedQueries(orgLogin, repoName, pageSize, branches) {
    let calls = 0;
    const callsNeeded = getCallsNeeded(pageSize, branches);
    let endCursor = "";
    while (calls < callsNeeded) {
      const afterClause = calls ? `, after: "${endCursor}"` : ``;
      yield `query {
        organization(login: "${orgLogin}") {
          repository(name: "${repoName}") {
            pullRequests(states: OPEN, first: ${pageSize}${afterClause}) {
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
  test("Test helper expectedQueries: pageSize 3, 5 branches", () => {
    const exq = expectedQueries("abc-co", "xyz-repo", 3, getBranches(5));
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
  test("Set with one branch", async () => {
    const orgLogin = "abc-co1";
    const repoName = "xyz-repo1";
    const pageSize = 100;
    const branches = getBranches(1);
    const exq = expectedQueries(orgLogin, repoName, pageSize, branches);
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
    [1, 3, "myLogin", "myRepoName"],
    [5, 10, "abc", "zys"],
    [10, 5, "two", "pages"],
    [80, 20, "eighty", "twenty"]
    // [],
    // []
  ])(
    "%d branches, pageSize %d, orgLogin %s, repoName %s",
    async (n, pageSize, orgLogin, repoName) => {
      const branches = getBranches(n);
      const exq = expectedQueries(orgLogin, repoName, pageSize, branches);
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
      const openPRRefNames = require("./index").openPRRefNames;
      const token = "myToken";
      const url = `git@github.com:${orgLogin}/${repoName}.git`;
      const result = await openPRRefNames(token, url, pageSize);
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
