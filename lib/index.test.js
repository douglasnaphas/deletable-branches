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
