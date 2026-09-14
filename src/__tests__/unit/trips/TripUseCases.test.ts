import {
  CompleteTripUseCase,
  CreateTripUseCase,
  GetActiveTripUseCase,
} from "../../../application/trips/useCases/TripUseCases"
import {
  CreateTripBoardingRequestUseCase,
  DecideBoardingRequestUseCase,
} from "../../../application/boarding/useCases/TripBoardingUseCases"
import { TripRepository } from "../../../domain/trips/TripRepository"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"

const now = new Date()
const trip = {
  id: 10,
  routeId: 3,
  driverId: 7,
  vehicleName: "Toyota Coaster",
  vehiclePlate: "LD-10-20-AA",
  vehicleCapacity: 30,
  status: "ACTIVE" as const,
  startedAt: now,
  endedAt: null,
  createdAt: now,
  updatedAt: now,
  counts: { total: 0, pending: 0, approved: 0, rejected: 0 },
  stats: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    availableSeats: 30,
  },
  occupancy: 0,
  availableSeats: 30,
  boardingRequests: [],
}

const request = {
  id: 20,
  tripId: 10,
  cadeteId: 11,
  driverId: 7,
  routeId: 3,
  status: "PENDING" as const,
  flagged: true,
  createdAt: now,
  updatedAt: now,
}

describe("Trip and direct boarding use cases", () => {
  let trips: jest.Mocked<TripRepository>
  let drivers: jest.Mocked<DriverRepository>
  let cadetes: jest.Mocked<CadeteRepository>
  let requests: jest.Mocked<BoardingRequestRepository>

  beforeEach(() => {
    trips = {
      createActive: jest.fn(),
      findActiveByDriver: jest.fn(),
      findActiveByRoute: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      updateVehicle: jest.fn(),
      transition: jest.fn(),
    }
    drivers = {
      getById: jest.fn(),
    } as unknown as jest.Mocked<DriverRepository>
    cadetes = {
      getRouteInfo: jest.fn(),
    } as unknown as jest.Mocked<CadeteRepository>
    requests = {
      createForTrip: jest.fn(),
      listMine: jest.fn(),
      findById: jest.fn(),
      decideForTrip: jest.fn(),
    } as unknown as jest.Mocked<BoardingRequestRepository>
  })

  it("creates an active trip from the driver's assigned route", async () => {
    drivers.getById.mockResolvedValue({
      id: 7,
      currentRouteId: 3,
    } as any)
    trips.createActive.mockResolvedValue(trip)

    const result = await new CreateTripUseCase(drivers, trips).execute(
      { id: 7, role: "DRIVER" },
      {
        vehicleName: " Toyota Coaster ",
        vehiclePlate: " ld-10-20-aa ",
        vehicleCapacity: 30,
      },
    )

    expect(trips.createActive).toHaveBeenCalledWith({
      routeId: 3,
      driverId: 7,
      vehicleName: "Toyota Coaster",
      vehiclePlate: "LD-10-20-AA",
      vehicleCapacity: 30,
    })
    expect(result.id).toBe(10)
  })

  it("rejects trip creation when the driver has no assigned route", async () => {
    drivers.getById.mockResolvedValue({
      id: 7,
      currentRouteId: null,
    } as any)

    await expect(
      new CreateTripUseCase(drivers, trips).execute(
        { id: 7, role: "DRIVER" },
        {
          vehicleName: "Toyota",
          vehiclePlate: "LD-10",
          vehicleCapacity: 20,
        },
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(trips.createActive).not.toHaveBeenCalled()
  })

  it("returns the active route trip and the cadete's current request", async () => {
    cadetes.getRouteInfo.mockResolvedValue({ stop: { route: { id: 3 } } })
    trips.findActiveByRoute.mockResolvedValue(trip)
    requests.listMine.mockResolvedValue([request])

    const result = await new GetActiveTripUseCase(
      cadetes,
      trips,
      requests,
    ).execute({ id: 11, role: "CADETE" })

    expect(result?.myRequest).toEqual(request)
    expect(result?.boardingRequests).toBeUndefined()
  })

  it("only lets the owner driver or an admin complete a trip", async () => {
    trips.findById.mockResolvedValue(trip)
    trips.transition.mockResolvedValue({
      ...trip,
      status: "COMPLETED",
      endedAt: now,
    })
    const useCase = new CompleteTripUseCase(trips)

    await expect(
      useCase.execute({ id: 8, role: "DRIVER" }, 10),
    ).rejects.toMatchObject({ statusCode: 403 })

    await expect(
      useCase.execute({ id: 7, role: "DRIVER" }, 10),
    ).resolves.toMatchObject({ status: "COMPLETED" })
  })

  it("creates a direct request and restricts decisions to its driver", async () => {
    requests.createForTrip.mockResolvedValue(request)
    requests.findById.mockResolvedValue(request)
    requests.decideForTrip.mockResolvedValue({
      ...request,
      status: "APPROVED",
      flagged: false,
    })

    await expect(
      new CreateTripBoardingRequestUseCase(requests).execute(
        { id: 11, role: "CADETE" },
        10,
      ),
    ).resolves.toEqual(request)

    const decide = new DecideBoardingRequestUseCase(requests)
    await expect(
      decide.execute({ id: 8, role: "DRIVER" }, 20, "APPROVED"),
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      decide.execute({ id: 7, role: "DRIVER" }, 20, "APPROVED"),
    ).resolves.toMatchObject({ status: "APPROVED" })
  })
})
