beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("remoteTrackingBranches", () => {
  test.each([
    [
      "2 branches, including origin/HEAD",
      "origin",
      Buffer.from(`abcdef12 HEAD\n` + `efaf33 master`),
      new Map([["master", "efaf33"]])
    ],
    [
      "5 branches, including origin/HEAD",
      "origin",
      Buffer.from(
        `abc1 branchA\n` +
          `abc2 HEAD\n` +
          `abc3 master\n` +
          `abc4 my-branch\n` +
          `abc5 my-other-branch`
      ),
      new Map([
        ["branchA", "abc1"],
        ["master", "abc3"],
        ["my-branch", "abc4"],
        ["my-other-branch", "abc5"]
      ])
    ],
    ["No branches", "origin", Buffer.from(""), new Map()]
  ])("%s", (desc, remote, bufContents, expected) => {
    jest.doMock("child_process", () => {
      return {
        execSync: jest.fn(command => {
          if (
            command ==
            `git branch -r --format="%(objectname) %(refname:lstrip=-1)" --list ${remote}/*`
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
    expect(rtbs.size).toEqual(expected.size);
    for (const b of expected) {
      expect(rtbs.get(b[0])).toEqual(b[1]);
    }
  });
});
