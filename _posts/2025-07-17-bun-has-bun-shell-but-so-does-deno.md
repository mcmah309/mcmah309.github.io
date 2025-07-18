---
layout: post
title: "Bun Has Bun Shell But So Does Deno"
# subtitle: ""
date: 2025-07-17
categories: [technical]
tags: [javascript]
# image:
#   path: /images/post-image.jpg
#   thumbnail: /images/post-image-thumb.jpg
#   caption: "Photo credit [Unsplash](https://unsplash.com/)"
author:
  name: "Dillon McMahon"
#   picture: "/images/your-avatar.jpg"
share: true
comments: false
---
# Bun Has Bun Shell But So Does Deno

One of the reason I considered picking bun over deno was [bun shell](https://bun.sh/docs/runtime/shell). Bun shell allows one to write cross-platform JavaScript & TypeScript scripts with bash-like interop. Bun shell has a growing set of built in commands:
`cd`, `ls`, `rm`, `echo`, `pwd`, `bun`, `cat`, `touch`, `mkdir`, `which`, `mv`, `exit`, `true`, `false`, `yes`, `seq`, `dirname`, `basename`. When these are encountered in a statement like ``` $`echo hi` ``` a cross platform execution is used. If a command is not recognized, like ``` $`sd world planet helloWorld.ts` ```, the local system command is executed. This allows for writing simple cross platform scripts and breaking out when needed.

A bun script on linux looks like the following 
```ts
#!/usr/bin/env bun
import { $ } from "bun";

await $`echo hi`;
```
executed with `./<SCRIPT_NAME`.

It is worth noting, cross-platform commands can always be bypassed with `sh -c <command>`.

## The Deno Alternative

Bun shell was actually inspired by [dax](https://github.com/dsherret/dax), which in turn was inspired by [zx](https://github.com/google/zx). With dax, the same functionality can be accomplished with deno, though not as widely publicized. dax has many of the same built in commands: `cd`, `echo`, `exit`, `cp`, `mv`, `rm`, `mkdir`, `pwd`, `sleep`, `test`, `touch`, `unset`, `cat`, `printenv`, `which`.

A deno script on linux looks like the following
```ts
#!/usr/bin/env -S deno run --allow-all --no-lock
import $ from "jsr:@david/dax";

await $`echo hi`;
```
executed with `./<SCRIPT_NAME`.

## Conclusion

As both bun and deno also have similar syntaxes and features for interacting with commands (piping, env variables, exit codes, etc.), the choice between them comes down to ecosystem preference rather than fundamental capability differences. Bun's shell is built-in and feels more integrated with the runtime, while deno's dax requires an additional dependency but offers more mature command implementations and better cross-platform compatibility.
For developers already committed to the bun ecosystem, bun shell provides a seamless scripting experience without external dependencies. However, those working with deno shouldn't feel compelled to switch runtimes just for shell scripting capabilities - dax delivers equivalent functionality with the added benefit of being battle-tested across more platforms and use cases.
Ultimately, both solutions solve the same problem: enabling developers to write maintainable, cross-platform scripts without dropping into bash or dealing with platform-specific command differences. The real winner here is the JavaScript/TypeScript ecosystem, which now has multiple robust options for shell scripting that were previously dominated by traditional shell languages.