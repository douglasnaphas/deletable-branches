const axios = require("axios");
const child_process = require("child_process");

const remoteTrackingBranches = require("./remoteTrackingBranches")
  .remoteTrackingBranches;
exports.remoteTrackingBranches = remoteTrackingBranches;

const getRemoteUrl = require("./getRemoteUrl").getRemoteUrl;
exports.getRemoteUrl = getRemoteUrl;

const GITHUB_URL = "https://api.github.com/graphql";
exports.GITHUB_URL = GITHUB_URL;
const PAGE_SIZE = 30;
exports.PAGE_SIZE = PAGE_SIZE;

exports.get_post_1 = async () => {
  await axios.get("https://jsonplaceholder.typicode.com/posts/1").then(r => {
    console.log(r.data);
  });
};

exports.print_user = async token => {
  await axios
    .post(
      GITHUB_URL,
      {
        query: `query { 
          viewer { 
            login } }`
      },
      {
        headers: {
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )
    .then(r => {
      console.log(r.data);
    })
    .catch(err => {
      console.error(`problem encountered getting the user`);
      process.exit(1);
    });
};

exports.printGitBranchR = () => {
  const rtbs = child_process.execSync("git branch -r").toString();
  console.log(rtbs);
};

const mapIntersection = (m1, m2) => {
  const m = new Map();
  for (const entry of m1) {
    if (m2.get(entry[0]) === entry[1]) {
      m.set(entry[0], entry[1]);
    }
  }
  return m;
};
exports.mapIntersection = mapIntersection;

const mapDifference = (m1, m2) => {
  const m = new Map(m1.entries());
  for (const entry of m2) {
    if (m.get(entry[0]) === entry[1]) {
      m.delete(entry[0]);
    }
  }
  return m;
};
exports.mapDifference = mapDifference;

const getOrgName = require("./getOrgName").getOrgName;
exports.getOrgName = getOrgName;

const getRepoName = require("./getRepoName").getRepoName;
exports.getRepoName = getRepoName;

exports.openPRRefNames = async (token, remoteUrl, pageSize) => {
  return await exports.getRemoteBranchesByPRStatus(
    token,
    remoteUrl,
    pageSize,
    "OPEN"
  );
};

exports.closedPRRefNames = async (token, remoteUrl, pageSize) => {
  return await exports.getRemoteBranchesByPRStatus(
    token,
    remoteUrl,
    pageSize,
    "CLOSED"
  );
};

exports.mergedPRRefNames = async (token, remoteUrl, pageSize) => {
  return await exports.getRemoteBranchesByPRStatus(
    token,
    remoteUrl,
    pageSize,
    "MERGED"
  );
};

exports.getRemoteBranchesByPRStatus = async (
  token,
  remoteUrl,
  pageSize,
  status
) => {
  const orgLogin = exports.getOrgName(remoteUrl);
  const repoName = exports.getRepoName(remoteUrl, orgLogin);
  let refNames;
  let done = false;
  const refMap = new Map();
  let afterClause = "";
  while (!done) {
    refNames = await axios
      .post(
        GITHUB_URL,
        {
          query: `query {
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
        }`
        },
        {
          headers: {
            Authorization: `bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )
      .then(r => {
        return r.data;
      })
      .catch(err => {
        console.error(`problem encountered querying GitHub`);
        process.exit(1);
      });

    if (
      refNames &&
      refNames.data &&
      refNames.data.organization &&
      refNames.data.organization.repository &&
      refNames.data.organization.repository.pullRequests &&
      Array.isArray(refNames.data.organization.repository.pullRequests.edges)
    ) {
      refNames.data.organization.repository.pullRequests.edges.forEach(
        prEdge => {
          // console.log(prEdge);
          // console.log(prEdge.node.commits.edges[0]);
          if (
            prEdge &&
            prEdge.node &&
            prEdge.node.headRefName &&
            prEdge.node.commits &&
            Array.isArray(prEdge.node.commits.edges) &&
            prEdge.node.commits.edges[0] &&
            prEdge.node.commits.edges[0].node &&
            prEdge.node.commits.edges[0].node.commit &&
            prEdge.node.commits.edges[0].node.commit.oid
          )
            refMap.set(
              prEdge.node.headRefName,
              prEdge.node.commits.edges[0].node.commit.oid
            );
        }
      );
      done = !refNames.data.organization.repository.pullRequests.pageInfo
        .hasNextPage;
      afterClause =
        !done &&
        refNames.data.organization.repository.pullRequests.pageInfo.endCursor &&
        `, after: "${refNames.data.organization.repository.pullRequests.pageInfo.endCursor}"`;
    }
  }
  return refMap;
};

exports.deletableBranches = () => exports.remoteTrackingBranches();
// you are deletable if you are:
// not in an open PR

// to make sure all the remote tracking branches are on the remote of interest,
// we should also ask a question of the remote...with some git remote command
