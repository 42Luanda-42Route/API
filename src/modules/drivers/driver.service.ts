import { PrismaClient } from "@prisma/client";
import { AssignRouteDTO } from "./driver.interface";
import bcrypt from "bcryptjs";
import jwt  from "jsonwebtoken";
const prisma = new PrismaClient();

export const driverService = {

  async findAll(){ return prisma.drivers.findMany({ omit: {passwrd: true} }); },

  async findById(id: number){ return prisma.drivers.findUnique({where: {id}}); },

  async create(data: any){ return prisma.drivers.create({data}); },

    async findUsernameOrEmail(usernameOrEmail: string)
    {
        return await prisma.drivers.findFirst({where:{
          OR:[
            {username: usernameOrEmail},
            {email: usernameOrEmail}
          ]
      }});
    },


    async login(username: string, password: string)
    {
      const isDriver = await this.findUsernameOrEmail(username);

      if (!isDriver) return { "message": "username or email not found"};

      const ok = await bcrypt.compare(password, isDriver.passwrd ?? '');
      if(!ok) return {"message": "Credenciais erradas"};

      const jwtToken = jwt.sign(
        {
          id: isDriver.id,
          username: isDriver.username,
          email: isDriver.email,
        }, 
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" }
      );

      return { token: jwtToken};
    },

    async update(id: number, data: any){
        return prisma.drivers.update({
            where: {id},
            data
        });
    },

    async delete(id: number){ return prisma.drivers.delete({ where: {id} }); },


    async updateLocation( id_driver: number, data: { lat: number; long: number }) {
      try {
        const existing = await prisma.driverCoordinates.findFirst({
          where: { id_driver },
        });

        if (!existing) {
          return await prisma.driverCoordinates.create({
            data: {
              id_driver,
              lat: data.lat,
              long: data.long,
            },
          });
        }

        await prisma.driverCoordinates.updateMany({
          where: { id_driver },
          data: {
            lat: data.lat,
            long: data.long,
          },
        });

        return { updated: true };
      } catch (error) {
        console.error("Erro ao atualizar coordenadas:", error);
        throw new Error("Erro ao atualizar localização do motorista");
      }
    },




    async assignRoute(driverId: number, data: AssignRouteDTO){
      const existDriverIdWithRoute = await prisma.drivers.findFirst({
        where: {current_route_id: data.current_route_id},
        select:{ id: true }
      });

      if (existDriverIdWithRoute)
        this.leaveRoute(existDriverIdWithRoute.id);
  
      return  prisma.drivers.update({
        where: { id: driverId},
        data:{ current_route_id: data.current_route_id },
        include:{
          current_route: true
        }
      });
    },

    async leaveRoute(driverId: number)
    {
      return prisma.drivers.update({
        where: {id: driverId},
        data:{ current_route_id: null }
      });
    }
};