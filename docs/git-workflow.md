# Git Workflow

`main` is stable and tested; `develop` is the integration branch. Create feature branches from `develop`. Descriptive names such as `ui_integration` are accepted, along with `feat/<module>/<feature-name>` and `fix/<module>/<issue-name>`. Do not commit directly to `main` or `develop`. Use Conventional Commits, open pull requests into `develop`, and obtain review plus passing lint, typecheck, test, and build checks before merging.
