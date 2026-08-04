# Getting Started with Tree-Sitter Salesforce

Welcome! This tutorial will guide you step-by-step on how to set up and use the `tree-sitter-salesforce` parsers for Apex and SOQL. Tree-sitter provides fast, error-tolerant parsing that creates a structural tree of your code, which is foundational for custom linters, analysis tools, and editor integrations.

For this tutorial, we will use the open-source `apex-recipes` repository as our test project to see tree-sitter in action.

## Prerequisites

Before we start, ensure you have the following installed on your machine:
- **Git**
- **Node.js** (v18+) and **npm**
- **Python** (v3.9+)
- A C/C++ compiler (such as GCC, Clang, or MSVC) for building the tree-sitter bindings.

---

## Step 1: Clone the Repositories

First, we need to clone both the `tree-sitter-salesforce` tool and the `apex-recipes` project which we will use as test data.

Open your terminal and run:

```bash
# Create a directory for our tutorial
mkdir salesforce-parsing-tutorial
cd salesforce-parsing-tutorial

# Clone the parser repository
git clone https://github.com/IhorAleksieienko/tree-sitter-salesforce.git

# Clone the apex-recipes repository (our test data)
git clone https://github.com/trailheadapps/apex-recipes.git
```

> [!NOTE]
> If you already have `tree-sitter-salesforce` and `apex-recipes` locally, you can simply use those paths.

---

## Step 2: Using the Tree-Sitter CLI (The Easiest Way to Test)

The Tree-Sitter CLI is a great way to visually inspect the syntax tree generated from a Salesforce code file.

1. Install the tree-sitter CLI globally:
   ```bash
   npm install -g tree-sitter-cli
   ```
   *(Run `tree-sitter init-config` if you get a warning about unconfigured parser directories).*

2. Navigate into the `apex` parser directory and compile the parser:
   ```bash
   cd tree-sitter-salesforce/apex
   npm install
   tree-sitter generate
   ```

3. Now, let's parse a real Apex class from the `apex-recipes` repository! We'll use `SOQLRecipes.cls`:
   ```bash
   # Make sure to use quotes around paths with spaces, especially on Windows!
   tree-sitter parse "../../apex-recipes/force-app/main/default/classes/Data Recipes/SOQLRecipes.cls"
   ```

You will see an output resembling a massive structural tree of the code, capturing classes, methods, modifiers, and SOQL expressions.

---

## Step 3: Using Python Bindings

For automation or analysis tools, you'll likely want to interact with the syntax tree programmatically. Here's how to do it in Python.

1. Set up a virtual environment and install the package:
   ```bash
   cd ../../tree-sitter-salesforce
   python -m venv venv
   
   # Activate the virtual environment
   # On Windows: venv\Scripts\activate
   # On Mac/Linux: source venv/bin/activate
   
   # Install the python tree-sitter bindings
   pip install tree-sitter
   pip install .
   ```

2. Create a test script `test_parser.py`:
   ```python
   import tree_sitter_salesforce as tss
   from tree_sitter import Language, Parser
   import sys
   
   def main():
       # Path to our test file
       filepath = "../../apex-recipes/force-app/main/default/classes/Data Recipes/SOQLRecipes.cls"
       
       # Read the Apex file
       with open(filepath, 'rb') as f:
           content = f.read()
   
       # Initialize the parser
       parser = Parser()
       parser.language = Language(tss.apex())
       
       # Parse the content
       tree = parser.parse(content)
       
       print(f"Parsed {filepath} successfully!")
       print(f"Root node type: {tree.root_node.type}")
       print(f"Contains syntax errors: {tree.root_node.has_error}")
       
       # Print out all method declarations found in the class
       query = parser.language.query("""
           (method_declaration
               name: (identifier) @method.name)
       """)
       
       matches = query.matches(tree.root_node)
       print("\nMethods found in this class:")
       for match in matches:
           for capture in match[1]:
               node = capture
               print(f"- {content[node.start_byte:node.end_byte].decode('utf8')}")
   
   if __name__ == '__main__':
       main()
   ```

3. Run your script:
   ```bash
   python test_parser.py
   ```
   > [!TIP]
   > Notice how we used a query `(method_declaration name: (identifier) @method.name)` to extract data. This is a very powerful feature of tree-sitter that acts like CSS selectors for your code.

---

## Step 4: Using Node.js Bindings

If you prefer JavaScript/TypeScript, you can easily use the parsers in a Node.js project.

1. Create a new Node.js project:
   ```bash
   cd ../
   mkdir node-salesforce-parser
   cd node-salesforce-parser
   npm init -y
   
   # Install tree-sitter and the local parser package
   npm install tree-sitter
   npm install ../tree-sitter-salesforce
   ```

2. Create a script `index.js`:
   ```javascript
   const Parser = require('tree-sitter');
   const Salesforce = require('tree-sitter-salesforce');
   const fs = require('fs');
   
   // Initialize parser
   const parser = new Parser();
   parser.setLanguage(Salesforce.apex);
   
   // Read our test file
   const filepath = '../apex-recipes/force-app/main/default/classes/Data Recipes/SOQLRecipes.cls';
   const content = fs.readFileSync(filepath, 'utf8');
   
   // Parse
   const tree = parser.parse(content);
   
   console.log(`Parsed successfully!`);
   console.log(`Root Node: ${tree.rootNode.type}`);
   
   // Walk the tree to find SOQL Expressions
   let soqlCount = 0;
   
   function walk(node) {
       if (node.type === 'soql_expression') {
           soqlCount++;
       }
       for (let i = 0; i < node.childCount; i++) {
           walk(node.child(i));
       }
   }
   
   walk(tree.rootNode);
   console.log(`Found ${soqlCount} inline SOQL queries in this file.`);
   ```

3. Run the script:
   ```bash
   node index.js
   ```

## Next Steps

Now that you have tree-sitter-salesforce successfully parsing Salesforce code, you can leverage it for:
- Writing custom CLI validation tools that run in CI/CD.
- Generating automated code documentation.
- Building intelligent IDE plugins with advanced autocomplete and snippet capabilities.

Be sure to check out the `/docs` folder in the `tree-sitter-salesforce` repository for a deeper understanding of Tree-Sitter's internals!
