export const basicControllerStub = `import type { ControllerContext } from "elysia"

export class {{ name }} {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        // something amazing
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        // something amazing
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        // something amazing
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        // something amazing
    }
}`;

export const basicMigrationStub = `import type { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("{{ tableName }}", (table) => {
    table.bigIncrements('id').primary()
    // your table schema
    table.timestamps(true, true)
    table.softDelete()
  })
}`;

export const basicModelStub = `import { Model } from '@utils'

export class {{ name }} extends Model {
    // something amazing
}`;

export const basicSeederStub = `import { {{ model }} } from "@models";

export default async function {{ name }}() {
    // =========================>
    // ## Seed the application's database
    // =========================>
    
    await {{ model }}.query().insert([]);
}
`;

export const blueprintStub = `[
    {
        "model"   :  "",
        "schema"  :  {},
        "relations": {},
        "controllers": {},
        "migrations"  :  true,
        "seeders"      :  [],
        "documentation": true
    }
]`;

export const daMigrationStub = `import { DAMigration } from "@utils"

export default class {{ className }} extends DAMigration {
  async up() { 
    await this.createTable("{{ tableName }}",(table) => {
      table.uuid()
    }, {
      engine: "MergeTree",
    })
  }
}
`;

export const lightControllerStub = `{{ marker }}
import type { ControllerContext } from "elysia"
import { permission } from '@utils'
import { {{ model }} } from '@models'



// ========================================>
// ## Permission of the resource.
// ========================================>
const p = permission.register({
    "{{ permission_code }}": {
        name: "{{ permission_name }}",
        accesses: {
            "00": "Melihat",
            "01": "Membuat",
            "02": "Mengubah",
            "03": "Menghapus",
        }
    }
})



export class {{ name }} {
    // ========================================>
    // ## Display a listing of the resource.
    // ========================================>
    static async index(c: ControllerContext) {
        p.have("{{ permission_code }}.00").guard(c)

        const { data, total } = await {{ model }}.query().resolve(c)
        
        c.responseData(data, total)
    }


    // =============================================>
    // ## Store a newly created resource.
    // =============================================>
    static async store(c: ControllerContext) {
        p.have("{{ permission_code }}.01").guard(c)

        c.validation<{{ model }}>({{{ validations }}})

        let record = {}

        try {
            record = await (new {{ model }}).pump(c.payload)            
        } catch (err) {
            c.responseError(err as Error, "Create {{ model }}")
        }

        c.responseSaved(record)
    }


    // ============================================>
    // ## Update the specified resource.
    // ============================================>
    static async update(c: ControllerContext) {
        p.have("{{ permission_code }}.02").guard(c)

        const record = await {{ model }}.query().findOrNotFound(c.params.id)

        c.validation<{{ model }}>({{{ validations }}})

        try {
            await record.pump(c.payload)
        } catch (err) {
            c.responseError(err as Error, "Update {{ model }}")
        }
        
        c.responseSaved(record)
    }


    // ===============================================>
    // ## Remove the specified resource.
    // ===============================================>
    static async destroy(c: ControllerContext) {
        p.have("{{ permission_code }}.03").guard(c)

        const record = await {{ model }}.query().findOrNotFound(c.params.id)
        
        try {
            await record.delete()
        } catch (err) {
            c.responseError(err as Error, "Delete {{ model }}")
        }

        c.responseSuccess(record)
    }
}
`;

export const lightMigrationStub = `{{ marker }}
import type { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("{{ tableName }}", (table) => {
    table.bigIncrements('id').primary()
{{ schemas }}
    table.timestamps(true, true)
    table.softDelete()
  })

{{ pivot }}
}`;

export const lightModelStub = `{{ marker }}
import { Model, SoftDelete{{ import_utils }} } from '@utils'
{{ import }}

export class {{ name }} extends Model {
    // =====================>
    // ## Field
    // =====================>
{{ fields }}

    @SoftDelete()
    deleted_at!: Date


    // =========================>
    // ## Relations
    // =========================>
{{ relations }}


    // =====================>
    // ## Attribute
    // =====================>
{{ attributes }}


    // =====================>
    // ## Hook
    // =====================>

}
`;

export const lightSeederStub = `{{ marker }}
import { {{ model }} } from "@models";

export default async function {{ name }}Seeder() {
    // =========================>
    // ## Seed the application's database
    // =========================>
    
    await (new {{ model }}).pump([
      {{ seeders }}
    ]);
}
`;

export const mailStub = `import { renderMailTemplate, sendMail } from "@utils"

export async function {{ name }}Mail(to: string) {
  const content = renderMailTemplate("{{ name }}", {
      title: "{{ title }}",
  })

  const send = await sendMail({
      subject: "{{ title }}",
      to: to,
      content: content
  })
  
  return send;
}
`;

export const notificationStub = `import { queue } from "@utils";

export async function {{ name }}Notification(payload: Record<string,any>) {
  await queue.add('notification', { payload })
}
`;

export const queueStub = `import { queue } from '@utils'

export const {{ name }}QueueWorker = () => {
  queue.worker("{{ worker_name }}", async (payload) => {
    
  })
}
`;

export const routeStub = `import { Elysia } from 'elysia'
import { api, middleware } from '@utils'
import { 

} from '@controllers'

export const {{ name }}Routes = (app: Elysia) => app.group('/{{ path }}', (route) => {

    return route;
})
`;
