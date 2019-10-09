beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("remoteTrackingBranches", () => {
  test.each([
    [
      "2 branches, including origin/HEAD",
      "origin",
      Buffer.from(`HEAD\n` + `master`),
      ["master"]
    ],
    [
      "5 branches, including origin/HEAD",
      "origin",
      Buffer.from(
        `branchA\n` + `HEAD\n` + `master\n` + `my-branch\n` + `my-other-branch`
      ),
      ["branchA", "master", "my-branch", "my-other-branch"]
    ],
    ["No branches", "origin", Buffer.from(""), []]
  ])("%s", (desc, remote, bufContents, expected) => {
    jest.doMock("child_process", () => {
      return {
        execSync: jest.fn(command => {
          if (
            command ==
            `git branch -r --format="%(refname:lstrip=-1)" --list ${remote}/*`
          ) {
            return Buffer.from(bufContents);
          }
          return Buffer.from("");
        })
      };
    });
    const remoteTrackingBranches = require("./remoteTrackingBranches")
      .remoteTrackingBranches;
    const rtbs = remoteTrackingBranches(remote);
    expect(rtbs.length).toEqual(expected.length);
    expected.forEach((e, i) => {
      expect(rtbs[i]).toEqual(e);
    });
  });
});
