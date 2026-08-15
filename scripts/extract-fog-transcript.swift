import Foundation
import PDFKit

guard CommandLine.arguments.count == 3 else {
  fatalError("Usage: extract-fog-transcript.swift input.pdf output.json")
}

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])

guard let document = PDFDocument(url: input) else {
  fatalError("Could not open PDF")
}

let pages = (0..<document.pageCount).compactMap { index -> String? in
  guard let text = document.page(at: index)?.string else { return nil }
  let normalized = text
    .replacingOccurrences(of: "[\\t ]+", with: " ", options: .regularExpression)
    .replacingOccurrences(of: " *\\n *", with: "\n", options: .regularExpression)
    .trimmingCharacters(in: .whitespacesAndNewlines)
  return normalized.isEmpty ? nil : normalized
}

let data = try JSONSerialization.data(withJSONObject: ["pages": pages], options: [.prettyPrinted])
try data.write(to: output)
