/**
 * OpenFGA authorization model for NeuralLog
 * 
 * This model defines the types and relations for the authorization system.
 * It supports multi-tenancy with proper namespacing.
 */
export const authorizationModel = {
  type_definitions: [
    // Tenant type
    {
      type: "tenant",
      relations: {
        admin: { this: {} },
        member: { this: {} },
        exists: { this: {} }
      }
    },
    
    // User type
    {
      type: "user",
      relations: {
        self: { this: {} }
      }
    },
    
    // Log type
    {
      type: "log",
      relations: {
        owner: { this: {} },
        reader: { this: {} },
        writer: { this: {} },
        parent: {
          type: "tenant"
        }
      },
      metadata: {
        relations: {
          parent: { directly_related_user_types: [{ type: "tenant" }] }
        }
      }
    },
    
    // Log entry type
    {
      type: "log_entry",
      relations: {
        owner: { this: {} },
        reader: { this: {} },
        writer: { this: {} },
        parent: {
          type: "log"
        }
      },
      metadata: {
        relations: {
          parent: { directly_related_user_types: [{ type: "log" }] }
        }
      }
    },
    
    // System type for global resources
    {
      type: "system",
      relations: {
        admin: { this: {} }
      }
    }
  ]
};
