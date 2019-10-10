# deletable-branches

List remote tracking branches in a Git repo in the current directory that were in PRs that were squashed and merged into master, and other notions of remote tracking branches that could be deleted.

## Run

Run with

```
npx deletable-branches --token-file /file/w/GitHubPersonalAccessToken --help
```

## Example

The repo [delebran/trepo-1](https://github.com/delebran/trepo-1) has had pull requests for the remote branches `s0`, `s1`, and `s2` squashed and merged into `master`, but they were not deleted on GitHub. They won't show up in the output of `git branch -r --merged`, because they were squashed.

You could run

```
npx deletable-branches --token-file /file/w/GitHubPersonalAccessToken --merged --not-open --squashed-diffs
```

to list remote tracking branches that:

1. Are included in pull requests on GitHub that were merged into master (`--merged`),
1. Are not included in any open pull requests on GitHub (`--not-open`), and
1. Introduced changes that can be found in the history of `master` (`--squashed-diff`).

`--squashed-diff` is based on the local Git commands used by [git-delete-squashed](https://www.npmjs.com/package/git-delete-squashed). `--merged`, `--not-open`, and `--closed` use the GitHub GraphQL API.

```
$ npx deletable-branches -t /file/w/GitHubPersonalAccessToken --merged --not-open --squashed-diff
npx: installed 8 in 1.895s
550e374f8a750e843816a494ed8a552cb9b2de80 s0
cadc0fe782925469e30390d17091d703b8469395 s1
dbaa5bfdb3c089fd0f0cddd3ad326dec66b6efde s2

$ npx deletable-branches -t /file/w/GitHubPersonalAccessToken --closed --not-open
npx: installed 8 in 1.045s
fa35c685665d1b2921497faa8ea0df54e433ec99 c0
e3bec591671413f17adc574642d57e72639b8ec4 c1
3b4ea38542f4b0d8e3a43982be060b97264535c1 c2

$ git branch -r --format="%(objectname) %(refname:lstrip=-1)" --list
f1737a94a41f2856a105f3dd70627975025f47e4 HEAD
fa35c685665d1b2921497faa8ea0df54e433ec99 c0
e3bec591671413f17adc574642d57e72639b8ec4 c1
3b4ea38542f4b0d8e3a43982be060b97264535c1 c2
55e188c1c5379b3da82c1165473ce7e5a37ab432 f0
ef7637a8a92b80709fd7990285512dd007daee69 f1
b4d87ecd472599241c8fe0ce61fb21e5dbc6716c m0
78793e9d43c2dc704b20c876d3c6883b2ae040fe m1
7db6474bbdbd21c8bbf45e8f9b3dce03199cf2f9 m2
f1737a94a41f2856a105f3dd70627975025f47e4 master
9f1e3c37043c0a341484548262053537665d73ac o0
1012e3a74ca16a38513af7b1a2bc20ed1bdfdec6 o1
586eb4ccfe50330fc84388e4f81282637b19514e o2
550e374f8a750e843816a494ed8a552cb9b2de80 s0
cadc0fe782925469e30390d17091d703b8469395 s1
dbaa5bfdb3c089fd0f0cddd3ad326dec66b6efde s2

$ git branch -r --format="%(objectname) %(refname:lstrip=-1)" --list --merged
f1737a94a41f2856a105f3dd70627975025f47e4 HEAD
b4d87ecd472599241c8fe0ce61fb21e5dbc6716c m0
78793e9d43c2dc704b20c876d3c6883b2ae040fe m1
7db6474bbdbd21c8bbf45e8f9b3dce03199cf2f9 m2
f1737a94a41f2856a105f3dd70627975025f47e4 master
```

Without `--merged`, `--not-open`, `--squashed-diffs`, or `--closed`, `deletable-branches` prints all the remote tracking branches.

## Deleting branches

You could use the output to delete branches with, for example,

```
npx deletable-branches -t /file/w/GitHubPersonalAccessToken \
  --merged --not-open --squashed-diff \
  | awk '{print $2}' \
  | while read b ; do \
  git push --force origin :${b} ; done
```

## GitHub Personal Access Token

You need a [GitHub Personal Access Token](https://developer.github.com/v4/guides/forming-calls/#authenticating-with-graphql) to use this script.

## Caveats

### Slashes

This probably will not work well when remotes have slashes (`/`) in their names. It does handle slashes in remote branch names. So a remote of `my/origin` as opposed to `origin` will probably not be picked up, but a branch name of `branch/name` as opposed to `branch-name` should be.

### Only for GitHub organizations

The calls to the GitHub API made by `--merged`, `--not-open`, and `--closed` only work when the repo you're in is within a GitHub organization/team. If you use the option `--squashed-diffs`, and not `--merged`, `--not-open`, or `--closed`, it should work on any repo.
