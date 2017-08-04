# Ph

A tool to quickly execute a git push or git pull. Ph uses huristical parser to try and make sense of
an extremely simple minilanguage.

> Puts the chemistry back into git push!
> - Anonymous

## Introduction
At its most simpleist, one can substitute `git push` for the `ph` command, saving a character:

```
$ ph origin master
Running `git push origin master`...
```

Branches and remotes can be abbreviated:

```
$ ph o m
Running `git push origin master`...
```

And, that whitespace is unnecessary:

```
$ ph om
Running `git push origin master`...
```

Want to pull instead? Add `pull`:
```
$ ph pull om
Running `git pull origin master`...
```

Or add a comma instead (comma is next to `l` for pull):
```
$ ph pull om,
Running `git pull origin master`...
```

Need to force push? Add `--force`:
```
$ ph om --force
Running `git push origin master --force`
```

Or, if you're lazy, just use `-f` (ph uses heuristics to guess that you mean `--force`)
```
$ ph om-f
Running `git push origin master --force`
```

## Usage
*NOTE:* Typically with all of these arguments, there are a few ways to do each thing. The longest
attempts to mirror the arguments passed to `git` as close as possible (and is a great place to
start) and the shortest is terse but makes logical sense.

### Entities
An entity is either a remote or branch. One may be specified by either spelling it out explicitly
(`master`) or abbreviating its first letter (`m`). In addition, branch prefixes are dropped. This
means that `feature/bar` will be matched with `b`.

```
$ ph om
Running git push origin master
```

### Pulling
To pull from a branch, the simplist way is to add the word `pull` (surrounded by spaces). To shrink
by a couple characters, an alternative is to pass the [flag](#flags) `-l`. However, the shortcut of
`,` can also be used to elimiate one more character. Comma is next to the `l` key on a QUERTY
keyboard, and l is in pu*ll*. (Hey, I needed a key not in `[A-Za-z0-9-]`!)

```
$ ph pull om
Running git pull origin master
$ ph om-l
Running git pull origin master
$ ph om,
Running git pull origin master
```

### Flags
If you'd like to force push (`--force`) or always create a merge commit when pulling (`--no-ff`),
specify a flag. Flags can either be specified in full (`--force`) or can be abbreviated (`-f`). A
number of huristics are set up to try and shorten the amount of characters that one has to type:

When pushing:
| Short flag | Converted to |
+------------+--------------+
| -v | --verbose |
| -f | --force |
| -n or --dry | --dry-run |

When pulling:
| Short flag | Converted to |
+------------+--------------+
| -l | pull (see [pull](#pulling) above) |
| -nf | --no-ff |
| -ff | --ff-only |

```
$ ph om--verbose
Running git push origin master --verbose
$ ph om-v
Running git push origin master --verbose
$ ph om-f
Running git push origin master --force
$ ph om--some-super-long-unknown-flag
Running git push origin master --some-super-long-unknown-flag
$ ph om-l-ff
Running git pull --ff-only origin master
```

## Alternate destination branches
A little known fact of git push/pull is that one can push or pull from one remote branch to a
different local branch. This is typically done with `git push origin master:remote-branch` (ie, push
the local branch `master` to the branch `remote-branch` on `origin`). Branch entities in ph
understand this, too:

```
$ ph om:r
Running git push origin master:remote-branch
$ ph o:r
Running git push origin :remote-branch
# Another cool tip: that last command with `:remote-branch` deletes `remote-branch` on the server!
Think "push nothing to remote-branch".
```

## Default branch and remote
If ph is run without any remote or branch, it defaults to using `origin` and the currently checked
out branch (if one is checked out) and if no branch is checked out, `master` or `trunk` (`master`
takes precidence if both exist). In addition, `.` can be used to indicate the current branch in a
more complicated expression.

```
$ ph
Running git push origin master
$ ph o.
Running git push origin master
$ ph o.:foo
Running git push origin master:foo
```
