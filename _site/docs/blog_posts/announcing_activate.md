# Announcing `activate`: A sane way to manage environment configuration

Recently I got sick of the way I had different imperative ways of managing environments across language domains and having to re-configure things locally to replicate QA bugs, plus the hassle of working in a monorepo. I am also a big fan of tools like `direnv` and that inspired me to create [activate](https://github.com/mcmah309/activate?tab=readme-ov-file).

Activate allows you to switch an entire repo/monorepo between environments and reload environment changes with a single command.

## Example Use Cases

1. You have assets, data files, executables, or program files that should be used in different environments like Dev, QA, etc. e.g.
    ```toml
    [dev.links]
    "app/data" = "path/to/dev/data"

    [qa.links]
    "app/data" = "path/to/qa/data"
    ```
    `app/data` is created and symlinked to the file or directory of the active environment.

2. You want different environment variables in each environment e.g.
    ```toml
    [dev.env]
    HOST = "localhost"
    PORT = 3000

    [qa.env]
    HOST = "178.32.44.2"
    PORT = 443
    ```
    To load into your current shell run (this will also unload any activate environment).
    ```bash
    eval "$(activate -e <name>)"`
    ```
    Alternatively you can load the active `.env` file yourself or from an application, located at `.activate/.env`.
    This can also be useful for dev containers. Just add `"runArgs": ["--env-file",".activate/.env"]` to your
    `.devcontainer/devcontainer.json` file.

3. You are using a mono-repo and want to switch everything to a certain environment. Run:
    ```bash
    activate -r <name>
    ```
    any directory/subdirecory (respecting `.gitignore`) with an `activate.toml` file is switched to `<name>`

 I hope this helps you too, more to come :)