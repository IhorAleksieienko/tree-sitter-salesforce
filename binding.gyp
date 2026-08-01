{
  "targets": [
    {
      "target_name": "tree_sitter_salesforce_binding",
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except"
      ],
      "include_dirs": [
        "apex/src",
        "soql/src"
      ],
      "sources": [
        "bindings/node/binding.cc",
        "apex/src/parser.c",
        "soql/src/parser.c"
      ],
      "conditions": [
        ["OS!='win'", {
          "cflags_c": [
            "-std=c11",
            "-fvisibility=hidden"
          ]
        }, {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": ["/utf-8"]
            }
          }
        }]
      ]
    }
  ]
}
