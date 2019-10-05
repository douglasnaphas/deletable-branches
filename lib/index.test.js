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
