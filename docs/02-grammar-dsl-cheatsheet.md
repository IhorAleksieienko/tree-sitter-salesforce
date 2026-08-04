# Tree-Sitter Grammar DSL — Cheatsheet

## Basic Building Blocks

| Function | What it does | Example |
|---|---|---|
| `'keyword'` | Match exact string | `'class'` |
| `/regex/` | Match regex pattern | `/[a-z]+/` |
| `seq(a, b, c)` | Match a THEN b THEN c | `seq('if', '(', $.expr, ')')` |
| `choice(a, b)` | Match a OR b | `choice('true', 'false')` |
| `repeat(a)` | Match 0+ times | `repeat($.statement)` |
| `repeat1(a)` | Match 1+ times | `repeat1($.modifier)` |
| `optional(a)` | Match 0 or 1 time | `optional($.else_clause)` |

## Advanced Functions

| Function | What it does | When to use |
|---|---|---|
| `prec(n, rule)` | Set precedence | Resolve `a + b * c` ambiguity |
| `prec.left(n, rule)` | Left-associative | `a + b + c` → `(a + b) + c` |
| `prec.right(n, rule)` | Right-associative | `a = b = c` → `a = (b = c)` |
| `token(rule)` | Merge into single token | `token(seq('/', '/'))` → one `//` token |
| `alias(rule, name)` | Rename in tree | `alias($.foo, $.bar)` |
| `field(name, rule)` | Name a child | `field('name', $.identifier)` |

## Grammar Properties

| Property | Purpose |
|---|---|
| `name` | Grammar name (must match tree-sitter.json) |
| `rules` | All grammar rules |
| `extras` | Tokens allowed anywhere (whitespace, comments) |
| `conflicts` | Known ambiguities to resolve via GLR |
| `inline` | Rules replaced by their definition |
| `word` | Keyword extraction optimization rule |
| `supertypes` | Abstract node categories |
| `externals` | External scanner tokens |

## Common Patterns

### Case-insensitive keyword
In Salesforce languages, keywords are case-insensitive. We use the `ci()` helper from `common/common.js` to define these:
```javascript
ci('SELECT') // Matches 'select', 'Select', 'SELECT', etc.
```

### Comma-separated list
Use `commaJoined` or `commaJoined1` from `common/common.js`:
```javascript
commaJoined1($.identifier) // Matches 'A, B, C'
```

### Optional trailing comma
```javascript
seq(repeat(seq(item, ',')), optional(item))
```

### Semicolon-terminated
```javascript
seq(content, ';')
```
