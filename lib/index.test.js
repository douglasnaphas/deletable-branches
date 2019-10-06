beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("getRepoName", () => {
  test.each`
    remoteUrl                                                | orgName            | expected
    ${"git@github.com:douglasnaphas/deletable-branches.git"} | ${"douglasnaphas"} | ${"deletable-branches"}
    ${"git@github.com:douglasnaphas/"}                       | ${""}              | ${""}
    ${"git@github.com:abc-co/abc-repo.git"}                  | ${"abc-co"}        | ${"abc-repo"}
    ${"git@github.com:abc-co/abc/repo.git"}                  | ${"abc-co"}        | ${"abc/repo"}
  `(
    "getRepoName($remoteUrl, $orgName) === $expected",
    ({ remoteUrl, orgName, expected }) => {
      const getRepoName = require("./index").getRepoName;
      expect(getRepoName(remoteUrl, orgName)).toEqual(expected);
    }
  );
});

describe("getRemoteUrl", () => {
  test.each`
    remote      | err      | rUrl
    ${"origin"} | ${false} | ${"git@github.com:douglasnaphas/deletable-branches.git"}
    ${"origin"} | ${true}  | ${""}
  `(
    "getRemoteUrl($remote), err: $err, expect: $rUrl",
    ({ remote, err, rUrl }) => {
      jest.doMock("child_process", () => {
        return {
          execSync: jest.fn(command => {
            if (err) throw "error";
            if (command == `git remote get-url ${remote}`) {
              return Buffer.from(rUrl);
            } else {
              return Buffer.from("");
            }
          })
        };
      });
      const getRemoteUrl = require("./index").getRemoteUrl;
      if (err) {
        expect(() => {
          getRemoteUrl(remote);
        }).toThrow();
      } else {
        expect(getRemoteUrl(remote)).toEqual(rUrl);
      }
    }
  );
});

describe("getOrgName", () => {
  const getOrgName = require("./index").getOrgName;
  test.each`
    remoteUrl                                                | expected
    ${"git@github.com:douglasnaphas/deletable-branches.git"} | ${"douglasnaphas"}
    ${"git@github.com:my-org/my-org-repo.git"}               | ${"my-org"}
    ${"git@github.com:bad-url-no-org.git"}                   | ${""}
    ${"not a URL at all"}                                    | ${""}
  `("getOrgName($remoteUrl) === $expected", ({ remoteUrl, expected }) => {
    expect(getOrgName(remoteUrl)).toEqual(expected);
  });
});

describe("remoteTrackingBranches", () => {
  test.each([
    [
      "2 branches, including origin/HEAD",
      "origin",
      Buffer.from(`  origin/HEAD -> origin/master\n` + `  origin/master`),
      ["origin/master"]
    ],
    [
      "5 branches, including origin/HEAD",
      "origin",
      Buffer.from(
        `  origin/branchA\n` +
          `  origin/HEAD -> origin/master\n` +
          `  origin/master\n` +
          `  origin/my-branch\n` +
          `  origin/my-other-branch`
      ),
      [
        "origin/branchA",
        "origin/master",
        "origin/my-branch",
        "origin/my-other-branch"
      ]
    ],
    ["No branches", "origin", Buffer.from(""), []]
  ])("%s", (desc, remote, bufContents, expected) => {
    jest.doMock("child_process", () => {
      return {
        execSync: jest.fn(command => {
          if (command == `git branch -r --list ${remote}`) {
            return Buffer.from(bufContents);
          }
          return Buffer.from("");
        })
      };
    });
    const remoteTrackingBranches = require("./index").remoteTrackingBranches;
    const rtbs = remoteTrackingBranches(remote);
    expect(rtbs.length).toEqual(expected.length);
    expected.forEach((e, i) => {
      expect(rtbs[i]).toEqual(e);
    });
  });
});

describe("openPRRefNames", () => {
  const getBranches = n => {
    const branches = [];
    for (let i = 0; i < n; i++)
      branches.push({
        headRefName: `branch-${n}-${Math.floor(Math.random() * 10)}`,
        cursor: `cursor${n}`
      });
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

    if (calls === 0) {
      yield `query {
        organization(login: "${orgLogin}") {
          repository(name: "${repoName}") {
            pullRequests(states: OPEN, first: ${PAGE_SIZE}) {
              totalCount
              pageInfo {
                endCursor
                hasNextPage
              }
              edges {
                node {
                  headRefName
                }
                cursor
              }
            }
          }
        }
      }`;
    }
  }
  function* expectedResponses(branches) {}
  test("Set with one branch", async () => {
    const mockPost = jest.fn(() => {
      return new Promise((resolve, reject) => {
        resolve({
          data: {
            data: {
              organization: {
                repository: {
                  pullRequests: {
                    edges: [{ node: { headRefName: "only-branch" } }]
                  }
                }
              }
            }
          }
        });
      });
    });
    jest.doMock("axios", () => {
      return {
        post: mockPost
      };
    });
    const openPRRefNames = require("./index").openPRRefNames;
    const result = await openPRRefNames("token", "url");
    expect(result.size).toEqual(1);
    expect(result.has("only-branch")).toBe(true);
  });
  test("Set with five branches", async () => {
    const mockPost = jest.fn(() => {
      return new Promise((resolve, reject) => {
        resolve({
          data: {
            data: {
              organization: {
                repository: {
                  pullRequests: {
                    edges: [
                      { node: { headRefName: "some-branch" } },
                      { node: { headRefName: "branch2" } },
                      { node: { headRefName: "Gulp" } },
                      { node: { headRefName: "palmTrees" } },
                      { node: { headRefName: "phone" } }
                    ]
                  }
                }
              }
            }
          }
        });
      });
    });
    jest.doMock("axios", () => {
      return {
        post: mockPost
      };
    });
    const openPRRefNames = require("./index").openPRRefNames;
    const result = await openPRRefNames("token", "url");
    expect(result.size).toEqual(5);
    ["Gulp", "palmTrees", "phone", "some-branch", "branch2"].forEach(branch => {
      expect(result.has(branch)).toBe(true);
    });
  });
  // TODO: make the remote branch getter return a Set
  test.skip("Set with 105 branches, requires paging", async () => {
    const branches = getBranches(105);

    const mockPost = jest.fn(() => {
      return new Promise((resolve, reject) => {
        resolve({
          data: {
            data: {
              organization: {
                repository: {
                  pullRequests: {
                    edges: getNodes(branches)
                  }
                }
              }
            }
          }
        });
      });
    });
    jest.doMock("axios", () => {
      return {
        post: mockPost
      };
    });
    const openPRRefNames = require("./index").openPRRefNames;
    const result = await openPRRefNames("token", "url");
    expect(result.size).toEqual(5);
    ["Gulp", "palmTrees", "phone", "some-branch", "branch2"].forEach(branch => {
      expect(result.has(branch)).toBe(true);
    });
  });
  test.each([
    [1, ["singular-branch"]],
    [5, ["theFirst", "the/second", "t/h/i/r/d", "branchFour", "codfish"]]
  ])("Set with %d branch(es)", async (n, branches) => {
    const mockPost = jest.fn(() => {
      return new Promise((resolve, reject) => {
        resolve({
          data: {
            data: {
              organization: {
                repository: {
                  pullRequests: {
                    edges: branches.map(b => {
                      return {
                        node: {
                          headRefName: b
                        }
                      };
                    })
                  }
                }
              }
            }
          }
        });
      });
    });
    jest.doMock("axios", () => {
      return {
        post: mockPost
      };
    });
    const openPRRefNames = require("./index").openPRRefNames;
    const result = await openPRRefNames("token", "url");
    expect(result.size).toEqual(n);
    branches.forEach(b => {
      expect(result.has(b)).toBe(true);
    });
  });
});
