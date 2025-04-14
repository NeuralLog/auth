/**
 * OpenFGA authorization model for NeuralLog
 *
 * This model defines the types and relations for the authorization system.
 * It supports multi-tenancy with proper namespacing and comprehensive RBAC.
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

    // Organization type
    {
      type: "organization",
      relations: {
        admin: { this: {} },
        member: { this: {} },
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

    // User type
    {
      type: "user",
      relations: {
        identity: { this: {} }
      }
    },

    // Role type
    {
      type: "role",
      relations: {
        assignee: { this: {} },
        parent: {
          type: "role"
        }
      },
      metadata: {
        relations: {
          parent: { directly_related_user_types: [{ type: "role" }] }
        }
      }
    },

    // Log type
    {
      type: "log",
      relations: {
        owner: { this: {} },
        reader: {
          union: {
            child: [
              { this: {} },
              {
                computedUserset: {
                  object: "",
                  relation: "admin"
                }
              }
            ]
          }
        },
        writer: {
          union: {
            child: [
              { this: {} },
              {
                computedUserset: {
                  object: "",
                  relation: "admin"
                }
              }
            ]
          }
        },
        parent: {
          type: "organization"
        }
      },
      metadata: {
        relations: {
          parent: { directly_related_user_types: [{ type: "organization" }] }
        }
      }
    },

    // Log entry type
    {
      type: "log_entry",
      relations: {
        owner: { this: {} },
        reader: {
          union: {
            child: [
              { this: {} },
              {
                computedUserset: {
                  object: "",
                  relation: "admin"
                }
              }
            ]
          }
        },
        writer: {
          union: {
            child: [
              { this: {} },
              {
                computedUserset: {
                  object: "",
                  relation: "admin"
                }
              }
            ]
          }
        },
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

    // API Key type
    {
      type: "apikey",
      relations: {
        owner: { this: {} },
        manager: {
          union: {
            child: [
              { this: {} },
              {
                computedUserset: {
                  object: "",
                  relation: "admin"
                }
              }
            ]
          }
        },
        parent: {
          type: "user"
        }
      },
      metadata: {
        relations: {
          parent: { directly_related_user_types: [{ type: "user" }] }
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
