#!/usr/bin/env node
/**
 * 模板预处理脚本
 * 在模板项目直接运行时，将 my-app 替换为目录名
 */
const fs = require('fs')
const path = require('path')

const projectName = path.basename(process.cwd())

// 需要处理的文件列表
const filesToProcess = [
  'package.json',
  'index.html',
  'src/components/Welcome/Welcome.tsx',
  'README.md'
]

filesToProcess.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8')
    if (content.includes('my-app')) {
      content = content.replace(/\{\{projectName\}\}/g, projectName)
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`✅ 已更新: ${file}`)
    }
  }
})

console.log(`\n✨ 模板预处理完成！项目名称: ${projectName}\n`)

