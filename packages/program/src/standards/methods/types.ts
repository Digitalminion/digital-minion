/**
 * Method System Types
 *
 * Defines method items (quality standards) for various constructs.
 * Methods can be partitioned by aspect (general) or by language/structure/feature (specific).
 */

/**
 * Validation strategy for method items
 */
export type ValidationStrategy =
  | 'automated'     // Fully automated validation
  | 'manual'        // Human review required
  | 'ai-assisted'   // AI helps with validation
  | 'peer-review'   // Requires peer review
  | 'measured';     // Metric-based validation

/**
 * Automated check type
 */
export interface AutomatedCheck {
  type: 'regex' | 'function' | 'api';
  configuration: Record<string, any>;
}

/**
 * Manual check definition
 */
export interface ManualCheck {
  reviewerRole?: string;
  reviewChecklist?: string[];
  estimatedTime?: number;
}

/**
 * Measurement-based validation
 */
export interface Measurement {
  metric: string;
  unit: string;
  threshold?: number | string;
  comparison?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
}

/**
 * Validation rule for a method item
 */
export interface ValidationRule {
  strategy: ValidationStrategy;
  description: string;
  automatedCheck?: AutomatedCheck;
  manualCheck?: ManualCheck;
  measurement?: Measurement;
}

/**
 * Expected output/artifact
 */
export interface ExpectedOutput {
  artifactType: string;
  location?: string;
  format?: string;
  size?: {
    min?: number;
    max?: number;
    unit: string;
  };
}

/**
 * Method item - a quality standard for a construct
 *
 * Stored in either:
 * - standard=method/construct={name}/aspect=_/
 * - standard=method/construct={name}/language={lang}/structure={struct}/feature={feat}/
 */
export interface MethodItem {
  // Identity
  rowId: string;              // Partition-aware ID
  id: string;                 // Human-readable ID
  subjectName: string;        // Construct name (Class, Architecture, etc.)

  // Taxonomy (partition path)
  taxonomyPath: string[];     // e.g., ["class", "_"] or ["programming", "typescript", "classes", "methods"]
  taxonomyDepth: number;      // Number of levels in taxonomy
  taxonomyFullPath: string;   // e.g., "class/_" or "programming/typescript/classes/methods"

  // Core fields
  description: string;
  category: string;           // implementation, documentation, testing, etc.
  required: boolean;

  // Validation
  validationRule: ValidationRule;

  // Artifact expectations
  artifactType?: string;
  expectedOutput?: ExpectedOutput;

  // Guidance
  tips?: string[];
  example?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

/**
 * Method partition type - determines partition structure
 */
export type MethodPartitionType = 'aspect' | 'feature';

/**
 * Aspect-based partition (2 levels: construct/aspect)
 */
export interface AspectPartition {
  type: 'aspect';
  construct: string;
  aspect: string;  // Usually "_" for general
}

/**
 * Feature-based partition (4 levels: construct/language/structure/feature)
 */
export interface FeaturePartition {
  type: 'feature';
  construct: string;
  language: string;
  structure: string;
  feature: string;
}

/**
 * Method partition union
 */
export type MethodPartition = AspectPartition | FeaturePartition;

/**
 * Input for creating a new method item (aspect-based)
 */
export interface CreateMethodItemAspectInput {
  id: string;
  subjectName: string;
  construct: string;
  aspect?: string;  // Defaults to "_"
  description: string;
  category: string;
  required: boolean;
  validationRule: ValidationRule;
  artifactType?: string;
  expectedOutput?: ExpectedOutput;
  tips?: string[];
  example?: string;
  metadata?: Record<string, any>;
}

/**
 * Input for creating a new method item (feature-based)
 */
export interface CreateMethodItemFeatureInput {
  id: string;
  subjectName: string;
  construct: string;
  language: string;
  structure: string;
  feature: string;
  description: string;
  category: string;
  required: boolean;
  validationRule: ValidationRule;
  artifactType?: string;
  expectedOutput?: ExpectedOutput;
  tips?: string[];
  example?: string;
  metadata?: Record<string, any>;
}

/**
 * Method reference in manifest
 */
export interface MethodReference {
  id: string;
  subjectName: string;
  partition: MethodPartition;
  taxonomyFullPath: string;
  category: string;
  required: boolean;
  path: string;
}

/**
 * Query for method items
 */
export interface MethodQuery {
  construct?: string;
  aspect?: string;
  language?: string;
  structure?: string;
  feature?: string;
  category?: string;
  required?: boolean;
  subjectName?: string;
}
