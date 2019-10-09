beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
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
