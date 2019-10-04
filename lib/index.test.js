beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
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
  test("2 branches, including origin/HEAD", () => {
    jest.doMock("child_process", () => {
      return {
        execSync: jest.fn(command => {
          if (command == "git branch -r")
            return Buffer.from(
              `  origin/HEAD -> origin/master\n` + `  origin/master`
            );
        })
      };
    });
    const remoteTrackingBranches = require("./index").remoteTrackingBranches;
    const rtbs = remoteTrackingBranches();
    expect(rtbs.length).toBeTruthy();
    expect(rtbs.length).toBe(1);
    expect(rtbs[0]).toEqual("origin/master");
  });
  test("5 branches, including origin/HEAD", () => {
    jest.doMock("child_process", () => {
      return {
        execSync: jest.fn(command => {
          if (command == "git branch -r")
            return Buffer.from(
              `  origin/branchA\n` +
                `  origin/HEAD -> origin/master\n` +
                `  origin/master\n` +
                `  origin/my-branch\n` +
                `  origin/my-other-branch`
            );
        })
      };
    });
    const remoteTrackingBranches = require("./index").remoteTrackingBranches;
    const rtbs = remoteTrackingBranches();
    expect(rtbs.length).toBeTruthy();
    expect(rtbs.length).toBe(4);
    expect(rtbs[0]).toEqual("origin/branchA");
    expect(rtbs[1]).toEqual("origin/master");
    expect(rtbs[2]).toEqual("origin/my-branch");
    expect(rtbs[3]).toEqual("origin/my-other-branch");
  });
  test.each([
    [
      "2 branches, including origin/HEAD",
      Buffer.from(`  origin/HEAD -> origin/master\n` + `  origin/master`),
      ["origin/master"]
    ],
    [
      "5 branches, including origin/HEAD",
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
    ]
  ])("%s", (desc, bufContents, expected) => {
    jest.doMock("child_process", () => {
      return {
        execSync: jest.fn(command => {
          if (command == "git branch -r") {
            return Buffer.from(bufContents);
          }
          return "";
        })
      };
    });
    const remoteTrackingBranches = require("./index").remoteTrackingBranches;
    const rtbs = remoteTrackingBranches();
    expect(rtbs.length).toEqual(expected.length);
    expected.forEach((e, i) => {
      expect(rtbs[i]).toEqual(e);
    });
  });
});
