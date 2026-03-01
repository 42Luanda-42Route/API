import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const cadeteService = {
    async findAll(){
        return prisma.cadetes.findMany();
    },

    async findById(id: number){
        return prisma.cadetes.findUnique({
            where: {id},
        });
    },

    async create(data: any){
        return prisma.cadetes.create({data});
    },
    async update(id: number, data: any){
        return prisma.cadetes.update({
            where: {id},
            data
        });
    },

    async delete(id: number){
        return prisma.cadetes.delete({
            where: {id}
        });
    },

    async findByUsernameOrEmail(usernameOrEmail: string) {
        return prisma.admins.findFirst({
        where: {
            OR: [
            { username: usernameOrEmail },
            { email: usernameOrEmail }
            ]
        }
        })
    },
    

    async getCadeteRouteId(cadete_Id: number){
        cadete_Id = Number(cadete_Id);
        return prisma.cadetes.findUnique({
            where: {id: cadete_Id},
            select:{
              full_name: true,
              stop:{
                  select:{
                      id: true,
                      stop_name: true,
                      distrit: true,
                      latitude: true,
                      longitude: true,
                      route:{
                          select:{
                              id: true,
                              route_name: true,
                              description: true,
                              drivers:{
                                    select:{
                                        full_name: true,
                                        phone: true
                                    }
                              }
                          }
                      }
                  }
              } 
            }
        });
    }
};