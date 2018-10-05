﻿using IntelliTect.Coalesce;
using IntelliTect.Coalesce.DataAnnotations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Coalesce.Domain.Services
{
    [Coalesce, Service]
    public interface IWeatherService
    {
        WeatherData GetWeather(AppDbContext parameterDbContext, Location location, DateTimeOffset? dateTime);

        Task<WeatherData> GetWeatherAsync(AppDbContext parameterDbContext, Location location, DateTimeOffset? dateTime);
    }

    public class WeatherService : IWeatherService
    {
        private readonly AppDbContext db;

        public WeatherService(AppDbContext db)
        {
            this.db = db;
        }


        public WeatherData GetWeather(AppDbContext parameterDbContext, Location location, DateTimeOffset? dateTime)
        {
            throw new NotImplementedException();
        }

        public async Task<WeatherData> GetWeatherAsync (AppDbContext parameterDbContext, Location location, DateTimeOffset? dateTime)
        {
            throw new NotImplementedException();;
        }
    }

    public class Location
    {
        public string City { get; set; }
        public string State { get; set; }
        public string Zip { get; set; }
    }

    public class WeatherData
    {
        public double TempFahrenheit { get; set; }

        public double Humidity { get; set; }
        
        public Location Location { get; set; }
    }
}
