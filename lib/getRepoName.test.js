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
      const getRepoName = require("./getRepoName").getRepoName;
      expect(getRepoName(remoteUrl, orgName)).toEqual(expected);
    }
  );
});
